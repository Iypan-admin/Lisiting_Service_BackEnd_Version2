const { supabase, supabaseAdmin } = require("../config/supabaseClient");
// Add a new elite card entry
const addEliteCard = async (req, res) => {
    try {
        const { student_name, register_number, card_number, card_type } = req.body;
        const user_id = req.user?.id; // user_id from token (set by authMiddleware)

        if (!user_id) {
            return res.status(401).json({ success: false, message: 'Unauthorized: user ID not found in token' });
        }

        // Map card names from elite_card_generate to match student_elite_cards constraint
        const cardTypeMap = {
            "EduPass": "Elite EduPass",
            "ScholarPass": "Elite ScholarPass",
            "InfinitePass": "Infinite Pass"
        };

        const mappedCardType = cardTypeMap[card_type];

        if (!mappedCardType) {
            return res.status(400).json({ success: false, message: "Invalid card type" });
        }

        const { data, error } = await supabase
            .from('student_elite_cards')
            .insert([
                {
                    student_name,
                    register_number,
                    card_number,
                    card_type: mappedCardType, // use mapped value
                    user_id, // store user_id for filtering
                },
            ]);

        if (error) throw error;

        return res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('Add Elite Card Error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to add elite card.' });
    }
};

// Get elite cards belonging to the logged-in user
const getEliteCards = async (req, res) => {
    try {
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ success: false, message: 'Unauthorized: user ID not found in token' });
        }

        const { data, error } = await supabase
            .from('student_elite_cards')
            .select('*')
            .eq('user_id', user_id) // only show cards of that user
            .order('created_at', { ascending: false });

        if (error) throw error;

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Fetch Elite Cards Error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch elite cards.' });
    }
};
// Get card_name from elite_card_generate based on card_number
const getCardNameByNumber = async (req, res) => {
    try {
        const { card_number } = req.query;

        if (!card_number) {
            return res.status(400).json({ success: false, message: "card_number is required" });
        }

        const { data, error } = await supabase
            .from("elite_card_generate")
            .select("card_name")
            .eq("card_number", card_number)
            .single(); // expect only 1 record

        if (error) {
            return res.status(404).json({ success: false, message: "Card not found" });
        }

        return res.status(200).json({ success: true, card_name: data.card_name });
    } catch (error) {
        console.error("Get Card Name Error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to fetch card name." });
    }
};

module.exports = {
    addEliteCard,
    getEliteCards,
    getCardNameByNumber,
};
