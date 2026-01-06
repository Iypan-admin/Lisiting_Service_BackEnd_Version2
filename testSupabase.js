const supabase = require('./config/supabaseClient'); // ✅ Correct relative path

const test = async () => {
    const { data, error } = await supabase.from("influencers").select("*");

    if (error) {
        console.error("❌ Error fetching data:", error.message);
    } else {
        console.log("✅ Influencer data:", data);
    }
};

test();
