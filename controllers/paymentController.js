// controllers/paymentController.js
const crypto = require("crypto");
const Razorpay = require("razorpay");
const { supabaseAdmin } = require("../config/supabaseClient");

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET;

// ✅ Razorpay instance
const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_SECRET,
});

exports.razorpayWebhook = async (req, res) => {
    try {
        // 1) Verify webhook signature (express.raw middleware required)
        const rawBody = req.body; // Buffer
        const shasum = crypto.createHmac("sha256", WEBHOOK_SECRET);
        shasum.update(rawBody);
        const digest = shasum.digest("hex");

        if (digest !== req.headers["x-razorpay-signature"]) {
            console.error("❌ Invalid Razorpay signature");
            return res.status(400).json({ error: "Invalid signature" });
        }

        // 2) Parse JSON
        const parsedBody = JSON.parse(rawBody.toString("utf8"));
        const event = parsedBody.event;
        console.log("📩 Webhook Event:", event);

        const entity = parsedBody?.payload?.payment?.entity;
        const orderEntity = parsedBody?.payload?.order?.entity;
        
        // Log full webhook structure for debugging
        console.log("🔍 Full Webhook Payload Structure:", JSON.stringify({
            event: parsedBody.event,
            payment_entity_keys: entity ? Object.keys(entity) : null,
            order_entity_keys: orderEntity ? Object.keys(orderEntity) : null,
            payment_notes: entity?.notes,
            order_notes: orderEntity?.notes,
            order_id: orderEntity?.id,
            payment_id: entity?.id
        }, null, 2));

        if (!entity) {
            console.error("❌ No payment entity in payload");
            return res.status(400).json({ error: "No payment entity" });
        }

        if (event !== "payment.captured") {
            // Only process captured
            return res.status(200).json({ status: "ignored" });
        }

        // 3) Prepare fields to store
        const {
            id: payment_id,
            order_id,
            method,
            vpa,
            contact,
            email,
            amount,
            notes,
            acquirer_data,
        } = entity;

        // Convert to rupees
        const rupeeAmount = (amount ?? 0) / 100;

        // ✅ Fetch Payment Page ID from Razorpay Order API
        // Since webhook doesn't include Payment Page ID, we need to fetch it from the order
        let paymentPageId = null;
        
        if (order_id) {
            try {
                console.log("🔍 Fetching order details from Razorpay for order_id:", order_id);
                const orderDetails = await razorpay.orders.fetch(order_id);
                
                // Log full order response to see all available fields
                console.log("📋 Full Order Response from Razorpay:", JSON.stringify({
                    id: orderDetails.id,
                    amount: orderDetails.amount,
                    currency: orderDetails.currency,
                    payment_page_id: orderDetails.payment_page_id,
                    payment_link_id: orderDetails.payment_link_id,
                    receipt: orderDetails.receipt,
                    status: orderDetails.status,
                    notes: orderDetails.notes,
                    all_keys: Object.keys(orderDetails)
                }, null, 2));
                
                // Try multiple possible field names for Payment Page ID
                paymentPageId = orderDetails.payment_page_id || 
                               orderDetails.payment_link_id ||
                               orderDetails.notes?.razorpay_payment_page_id || 
                               orderDetails.notes?.payment_page_id ||
                               orderDetails.notes?.payment_link_id;
                
            } catch (orderError) {
                console.error("❌ Error fetching order from Razorpay:", orderError);
                // Continue with fallback search
            }
        }

        // Fallback: Check webhook payload if API fetch didn't work
        if (!paymentPageId) {
            paymentPageId = 
                orderEntity?.payment_page_id ||
                orderEntity?.notes?.razorpay_payment_page_id ||
                orderEntity?.notes?.payment_page_id ||
                notes?.razorpay_payment_page_id ||
                notes?.payment_page_id ||
                entity?.payment_page_id ||
                parsedBody?.payload?.payment_page?.entity?.id ||
                parsedBody?.payload?.order?.entity?.payment_page_id;
        }
        
        // If Payment Page ID still not found, use amount as fallback (temporary solution)
        // This handles cases where Payment Page ID is not stored in order notes
        if (!paymentPageId) {
            console.warn("⚠️ Payment Page ID not found. Using amount-based fallback for amount:", rupeeAmount);
            
            // Fallback to amount-based mapping (temporary until Payment Page ID is added to order notes)
            if (rupeeAmount === 49) {
                paymentPageId = "pl_R5UkOtgHt3lsGS"; // EduPass
            } else if (rupeeAmount === 299) {
                paymentPageId = "pl_R5WECrT1suZkyp"; // ScholarPass
            } else if (rupeeAmount === 499) {
                paymentPageId = "pl_R5WHXwmt9YlUnc"; // InfinitePass
            } else {
                console.error("❌ No payment page ID found and amount doesn't match any known plan.");
                console.error("❌ Payment ID:", payment_id, "Order ID:", order_id, "Amount:", rupeeAmount);
                return res.status(400).json({ error: "No payment page ID found and amount doesn't match known plans" });
            }
            
            console.log("⚠️ Using fallback Payment Page ID based on amount:", paymentPageId);
        }

        console.log("📋 Payment Page ID received:", paymentPageId);

        let card_name = null;
        if (paymentPageId === "pl_R5UkOtgHt3lsGS") {
            card_name = "EduPass";
        } else if (paymentPageId === "pl_R5WECrT1suZkyp") {
            card_name = "ScholarPass";
        } else if (paymentPageId === "pl_R5WHXwmt9YlUnc") {
            card_name = "InfinitePass";
        } else {
            // ❌ Ignore other pages
            console.log("❌ Ignored - Not from our 3 plan pages. Payment Page ID:", paymentPageId, "Amount:", rupeeAmount);
            return res.status(200).json({ status: "ignored" });
        }

        console.log("✅ Card name determined:", card_name);


        // 4) Insert into Supabase (new table: elite_card_payment)
        const { data, error } = await supabaseAdmin
            .from("elite_card_payment")
            .insert([
                {
                    payment_id,
                    order_id: order_id || null,
                    bank_rrn: acquirer_data?.rrn || null,
                    payment_method: method || null,
                    upi_id: vpa || null,
                    customer_phone: contact || null,
                    customer_email: email || null,
                    amount: rupeeAmount, // rupees
                    city: notes?.city || null,
                    full_name: notes?.full_name || null,
                    name_on_the_pass: notes?.name_on_the_pass || null,
                    pin_code: notes?.pin_code || null,
                    status: "success",
                    card_name, // 👈 new field
                },
            ]);

        if (error) {
            console.error("❌ Supabase insert error:", error);
            console.error("❌ Attempted to insert data:", {
                payment_id,
                order_id,
                card_name,
                amount: rupeeAmount,
                customer_email: email,
                customer_phone: contact
            });
            return res.status(500).json({ error: "Database insert failed" });
        }

        console.log("✅ Payment saved to DB (elite_card_payment):", data);
        console.log("✅ Saved details - Card:", card_name, "Amount:", rupeeAmount, "Payment ID:", payment_id);
        return res.status(200).json({ status: "ok" });
    } catch (err) {
        console.error("❌ Webhook error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
