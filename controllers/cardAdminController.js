// controllers/cardAdminController.js
const { supabase } = require("../config/supabaseClient");
const { sendCardMail } = require("../utils/mailer"); // 🔹 mailer helper import

// ✅ Get all pending cards for verification
exports.getPendingCards = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("elite_card_generate")
            .select("*")
            .eq("status", "card_generated")
            .order("created_at", { ascending: true });

        if (error) throw error;

        res.json({ success: true, cards: data });
    } catch (err) {
        console.error("Error fetching pending cards:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ✅ Approve a card + send mail
exports.approveCard = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Update status
        const { data, error } = await supabase
            .from("elite_card_generate")
            .update({
                status: "approved",
                updated_at: new Date(),
            })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        const approvedCard = data;

        // 2. Mail logic trigger
        if (approvedCard?.email && approvedCard?.pdf_url) {
            await sendCardMail(
                approvedCard.email,
                approvedCard.card_name,
                approvedCard.name_on_the_pass,
                approvedCard.card_number,
                approvedCard.pdf_url
            );
        }

        res.json({
            success: true,
            message: "Card approved successfully & mail sent",
            card: approvedCard,
        });
    } catch (err) {
        console.error("Error approving card:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ✅ Reject a card
exports.rejectCard = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from("elite_card_generate")
            .update({
                status: "rejected",
                updated_at: new Date(),
            })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, message: "Card rejected successfully", card: data });
    } catch (err) {
        console.error("Error rejecting card:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ✅ Get all verified/approved cards (includes expired cards that were previously approved)
exports.getApprovedCards = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("elite_card_generate")
            .select("*")
            .in("status", ["approved", "expired"]) // Include both approved and expired cards
            .order("updated_at", { ascending: false });

        if (error) throw error;

        res.json({ success: true, cards: data });
    } catch (err) {
        console.error("Error fetching approved cards:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};