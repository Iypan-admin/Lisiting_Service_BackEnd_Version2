const { supabaseAdmin } = require("../config/supabaseClient");
const csv = require("csv-parser");
const fs = require("fs");

async function getNextReferenceId() {
    const { data, error } = await supabaseAdmin
        .from("giveaway")
        .select("reference_id");

    if (error) throw error;

    let lastNumber = 3859; // so first becomes ISMLINO3860

    if (data && data.length > 0) {
        // map all numbers from reference_id
        const numbers = data
            .map((row) => {
                const match = row.reference_id?.match(/ISMLINO(\d+)/);
                return match ? parseInt(match[1], 10) : null;
            })
            .filter((n) => n !== null);

        if (numbers.length > 0) {
            lastNumber = Math.max(...numbers); // ✅ get max number
        }
    }

    return lastNumber + 1;
}

// ✅ Upload CSV and insert into Supabase (2 stage control)
exports.uploadGiveawayCSV = async (req, res) => {
    try {
        if (!req.file && !req.body.validRows) {
            return res.status(400).json({ error: "CSV file is missing" });
        }

        const forceInsert = req.query.forceInsert === "true";

        // 🔹 Stage 2: frontend confirm பண்ணி வந்தா validRows body-ல இருக்கும்
        if (forceInsert && req.body.validRows) {
            try {
                const validRows = req.body.validRows;
                if (validRows.length === 0) {
                    return res.status(200).json({ status: "ok", inserted: 0 });
                }

                const { data, error } = await supabaseAdmin
                    .from("giveaway")
                    .insert(validRows);

                if (error) {
                    return res.status(500).json({ error: "Database insert failed" });
                }

                return res.status(200).json({
                    status: "ok",
                    inserted: data?.length || 0
                });
            } catch (err) {
                return res.status(500).json({ error: "Force insert failed" });
            }
        }

        // 🔹 Stage 1: First upload → parse CSV
        const results = [];
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on("data", (row) => results.push(row))
            .on("end", async () => {
                try {
                    const { data: existing, error: exError } = await supabaseAdmin
                        .from("giveaway")
                        .select("customer_email");
                    if (exError) throw exError;

                    const existingEmails = new Set(
                        existing.map((e) => e.customer_email?.toLowerCase())
                    );

                    let nextId = await getNextReferenceId();
                    const insertData = [];
                    const duplicates = [];

                    results.forEach((row) => {
                        const email = row.customer_email?.toLowerCase();
                        if (email && existingEmails.has(email)) {
                            duplicates.push(row.customer_email);
                        } else {
                            const refId = `ISMLINO${nextId++}`;
                            insertData.push({
                                reference_id: refId,
                                name_on_the_pass: row.name_on_the_pass,
                                card_name: row.card_name || null,
                                city: row.city || null,
                                customer_email: row.customer_email || null,
                                customer_phone: row.customer_phone || null,
                                status: row.status || "success",
                                created_at: new Date().toISOString(),
                            });
                        }
                    });

                    fs.unlinkSync(req.file.path);

                    if (duplicates.length > 0) {
                        return res.status(200).json({
                            status: "duplicate_found",
                            duplicates,
                            validRows: insertData
                        });
                    }

                    if (insertData.length > 0) {
                        const { data, error } = await supabaseAdmin
                            .from("giveaway")
                            .insert(insertData);

                        if (error) {
                            return res.status(500).json({ error: "Database insert failed" });
                        }

                        return res.status(200).json({
                            status: "ok",
                            inserted: data?.length || 0
                        });
                    }

                    return res.status(200).json({ status: "ok", inserted: 0 });
                } catch (err) {
                    return res.status(500).json({ error: "CSV processing failed" });
                }
            });
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};

// ✅ Insert single manual giveaway entry
exports.addGiveawayManual = async (req, res) => {
    try {
        const {
            name_on_the_pass,
            card_name,
            city,
            customer_email,
            customer_phone,
            status
        } = req.body;

        // Basic validation
        if (!name_on_the_pass) {
            return res.status(400).json({ error: "name_on_the_pass is required" });
        }

        // 🔑 Duplicate check by email
        if (customer_email) {
            const { data: existing, error: exError } = await supabaseAdmin
                .from("giveaway")
                .select("id")
                .eq("customer_email", customer_email.toLowerCase());

            if (exError) throw exError;

            if (existing.length > 0) {
                return res.status(200).json({
                    status: "duplicate_found",
                    duplicates: [customer_email],
                });
            }
        }

        // ✅ Auto-generate reference_id
        const nextId = await getNextReferenceId();
        const refId = `ISMLINO${nextId}`;

        const { data, error } = await supabaseAdmin
            .from("giveaway")
            .insert([{
                reference_id: refId,
                name_on_the_pass,
                card_name: card_name || null,
                city: city || null,
                customer_email: customer_email || null,
                customer_phone: customer_phone || null,
                status: status || "success",
                created_at: new Date().toISOString(),
            }]);

        if (error) {
            return res.status(500).json({ error: "Insert failed" });
        }

        return res.status(201).json({ message: "Giveaway entry added", data });
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};

// ✅ Fetch all giveaways
exports.getAllGiveaways = async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("giveaway")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            return res.status(500).json({ error: "Fetch failed" });
        }

        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};

// ✅ Get Card Stats (Pending, Active, Expired/Inactive, Total)
exports.getCardStats = async (req, res) => {
    try {
        // 1. Get all generated cards
        const { data: cards, error } = await supabaseAdmin
            .from("elite_card_generate")
            .select("id, status");

        if (error) {
            return res.status(500).json({ error: "Card fetch failed" });
        }

        // 2. Calculate counts
        const pending = cards.filter((c) => c.status === "card_generated").length;
        const active = cards.filter((c) => c.status === "approved").length;
        const expired = cards.filter((c) => c.status === "expired").length;
        // Total includes pending, active, and expired (inactive) cards
        const total = pending + active + expired;

        return res.status(200).json({ total, pending, active, expired });
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};

// ✅ Get recent 2 Pending Cards from elite_card_generate
exports.getRecentPendingCards = async (req, res) => {
    try {
        // Fetch recent 2 pending cards
        const { data: cards, error } = await supabaseAdmin
            .from("elite_card_generate")
            .select("id, name_on_the_pass, email, card_number, card_name, status, created_at")
            .eq("status", "card_generated")   // only pending
            .order("created_at", { ascending: false })
            .limit(2);

        if (error) {
            return res.status(500).json({ error: "Card fetch failed" });
        }

        return res.status(200).json(cards);
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};
