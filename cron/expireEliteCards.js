// file: cron/expireEliteCards.js
const { supabaseAdmin } = require("../config/supabaseClient");
const cron = require("node-cron");

// 🔄 Daily cron job: runs at 12:00 AM IST every day
cron.schedule("0 0 * * *", async () => {
// ⚡ For testing, uncomment the line below to run every minute:
// cron.schedule(
//   "* * * * *",
//   async () => {
    try {
      // Get today's date in YYYY-MM-DD format
      // Using local date to match the server's timezone (should be IST)
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const todayDateStr = `${year}-${month}-${day}`; // Format: YYYY-MM-DD

      console.log(
        `🔍 [Elite Cards Expiry] Checking for expired cards as of ${todayDateStr}...`
      );
      console.log(
        `   Current server time: ${today.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })}`
      );

      // First, let's check which cards are eligible for expiry (for debugging)
      const { data: eligibleCards, error: checkError } = await supabaseAdmin
        .from("elite_card_generate")
        .select("id, card_number, name_on_the_pass, valid_thru, status")
        .eq("status", "approved")
        .lte("valid_thru", todayDateStr); // valid_thru <= today (expired on or before today)

      if (checkError) {
        console.error(
          "❌ [Elite Cards Expiry] Error checking eligible cards:",
          checkError
        );
        return;
      }

      const eligibleCount = eligibleCards ? eligibleCards.length : 0;
      console.log(
        `📊 [Elite Cards Expiry] Found ${eligibleCount} card(s) eligible for expiry`
      );

      if (eligibleCount > 0) {
        console.log(`   Eligible cards:`);
        eligibleCards.forEach((card) => {
          console.log(
            `   - Card #${card.card_number} (${card.name_on_the_pass}), Valid thru: ${card.valid_thru}, Status: ${card.status}`
          );
        });
      }

      // Update expired elite cards
      // Only expire cards that:
      // 1. Have status = 'approved' (only approved cards can expire)
      // 2. valid_thru <= today (expired on or before today)
      const { data, error } = await supabaseAdmin
        .from("elite_card_generate")
        .update({
          status: "expired",
          updated_at: new Date().toISOString(),
        })
        .eq("status", "approved") // Only update approved cards
        .lte("valid_thru", todayDateStr) // valid_thru <= today (expired on or before today)
        .select(); // ✅ Ensure Supabase returns updated rows

      if (error) {
        console.error(
          "❌ [Elite Cards Expiry] Error updating expired cards:",
          error
        );
      } else {
        const updatedCount = data ? data.length : 0;
        if (updatedCount > 0) {
          console.log(
            `✅ [Elite Cards Expiry] Successfully expired ${updatedCount} elite card(s)`
          );
          // Log card details for debugging
          data.forEach((card) => {
            console.log(
              `   ✅ Expired: Card #${card.card_number} (${card.name_on_the_pass}), Valid thru: ${card.valid_thru}`
            );
          });
        } else {
          console.log(
            `ℹ️  [Elite Cards Expiry] No cards expired. (${eligibleCount} eligible but may already be expired)`
          );
        }
      }
    } catch (err) {
      console.error("❌ [Elite Cards Expiry] Cron job error:", err);
    }
  },
  { timezone: "Asia/Kolkata" }
);

console.log(
  "🕒 [Elite Cards Expiry] Cron job started (runs every Midnight)..."
);
