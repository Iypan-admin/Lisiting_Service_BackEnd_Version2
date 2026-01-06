const { supabase, supabaseAdmin } = require("../config/supabaseClient");
const nodemailer = require("nodemailer");
const path = require("path");
const { text } = require('stream/consumers');

const registerInfluencer = async (req, res) => {
    try {
        const { name, email, phone, role } = req.body;
        console.log("Received data:", { name, email, phone, role, });

        if (!name || !email || !phone || !role) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // 🔍 Step 1: Check if email already exists
        const { data: existingInfluencer, error: checkError } = await supabase
            .from("influencers")
            .select("email")
            .eq("email", email)
            .single(); // returns one record if exists

        if (checkError && checkError.code !== "PGRST116") {
            console.error("Supabase email check error:", checkError);
            throw checkError;
        }

        if (existingInfluencer) {
            return res.status(400).json({ error: "This email is already registered." });
        }

        // Step 2: Get current count
        const { count, error: countError } = await supabase
            .from("influencers")
            .select("*", { count: "exact", head: true });

        if (countError) {
            console.error("Supabase count error:", countError);
            throw countError;
        }

        const influencer_id = `ismlinflu${100 + count + 1}`;
        console.log("Generated Influencer ID:", influencer_id);

        // Step 3: Insert into DB
        const { data, error: insertError } = await supabase.from("influencers").insert([
            {
                name,
                email,
                phone,
                influencer_id,
                role,
            },
        ]);

        if (insertError) {
            console.error("Insert error:", insertError);
            throw insertError;
        }

        // Step 4: Send Email
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        });

        const pdfPath1 = path.join(__dirname, "../pdf/ISML_Language_Quest.pdf");
        const pdfPath2 = path.join(__dirname, "../pdf/Media_Kit.pdf");
        const imgPath1 = path.join(__dirname, "../assets/Poster1.png");
        const imgPath2 = path.join(__dirname, "../assets/Poster2.png");
        const videoPath = path.join(__dirname, "../assets/Reel1.mp4");

        const mailOptions = {
            from: `"ELITE CARD - Indian School for Modern Languages" <${process.env.MAIL_USER}>`,
            to: email,
            subject: "Thank You for Partnering with ISML Elite Membership.",
            html: `
  <div style="font-family: Arial, sans-serif; font-size: 15px; color: #222; line-height: 1.6;">
    <p style="font-size:16px;">Hi <b style="color:#1a73e8;">${name}</b>,</p>

    <p>We’re truly grateful to have you collaborate with us on this exciting journey. 
    As a token of appreciation, we’re delighted to gift you our 
    <b style="color:#e63946;">Elite InfinityPass Membership</b> 
    (worth <b>₹59,700+</b> in benefits) – absolutely free, with exclusive premium privileges.</p>

    <h3 style="margin-top: 24px; color:#1a73e8;">✨ What We Request from You</h3>
    <ol style="padding-left:20px;">
      <li style="margin-bottom:10px;">
        Share our campaign – Post about <b style="color:#e63946;">ISML Language Quest ’25</b> and your giveaway campaign across:
        <ul style="list-style: none; padding-left: 0; margin-top:8px;">
          <li>✔ Instagram (Reel, Post, Story)</li>
          <li>✔ Facebook (Reel, Post, Story)</li>
          <li>✔ YouTube (Shorts/Video)</li>
          <li>✔ WhatsApp (Forward to groups or Status update)</li>
        </ul>
      </li>
      <li style="margin-bottom:10px;">
        Upload our provided video content on your platforms and tag: 
        <b style="color:#1a73e8;">@learnwithisml</b> + <b style="color:#1a73e8;">@ismlconnect</b>. 
        Also share the Quiz link: 
        <a href="https://forms.gle/ZrUCYeQHB7vz96LZ7" target="_blank">https://forms.gle/ZrUCYeQHB7vz96LZ7</a>
      </li>
      <li>⭐ Optional Content: If you’d like to create your own additional posts or videos, please seek prior approval from our team before publishing.</li>
    </ol>

    <h3 style="margin-top: 24px; color:#1a73e8;">🎯 Our Expectation</h3>
    <p>We’d love your support in encouraging at least 
    <b style="color:#e63946;">10 participants</b> from your network. Kindly spread this opportunity among your 
    <b>family, friends, peers, and collaborators</b> so more students can benefit.</p>

    <h3 style="margin-top: 24px; color:#1a73e8;">🌍 Why This Partnership Matters</h3>
    <ul style="list-style:none; padding-left:0;">
      <li>✔ Together, we’ll inspire thousands of students to celebrate language learning.</li>
      <li>✔ Your influence will make ISML’s <b style="color:#e63946;">10th Anniversary</b> truly special.</li>
      <li>✔ Your Elite InfinityPass gives you privileged access to ISML’s programs, events, and exclusive opportunities.</li>
    </ul>

    <h3 style="margin-top: 24px; color:#1a73e8;">💳 Your Exclusive InfinityPass Details</h3>
    <ul style="list-style:none; padding-left:0;">
      <li>🎫 <b>Validity:</b> 3 Years</li>
      <li>🌐 <b>Languages:</b> All Current & Upcoming (Online + Offline)</li>
      <li>💰 <b>Discounts:</b> Up to 15% off across ISML programs & certifications</li>
    </ul>

    <h3 style="margin-top: 24px; color:#1a73e8;">⭐ Additional Elite Benefits:</h3>
    <ul style="list-style:none; padding-left:0;">
      <li>✔ Benefits worth <b>₹59,700+</b></li>
      <li>✔ Study Abroad Guidance</li>
      <li>✔ 3-Month Certified Internship</li>
      <li>✔ Placement Assistance & Priority Support</li>
    </ul>

    <p style="margin-top: 16px;">Once again, thank you for being part of the 
    <b style="color:#e63946;">ISML family</b> – let’s make this journey inspiring and impactful!</p>

    <p style="margin-top: 32px;">
      Warm regards,<br>
      <b style="color:#1a73e8;">Team ISML – Elite Membership</b><br>
      <a href="https://www.indianschoolformodernlanguages.com/elite-card" target="_blank">www.indianschoolformodernlanguages.com/elite-card</a>
    </p>
  </div>
`,

            attachments: [
                { filename: "ISML Language Quest’25.pdf", path: pdfPath1 },
                { filename: "Media Kit -Captions.pdf", path: pdfPath2 },
                { filename: "Poster1.png", path: imgPath1 },
                { filename: "Poster2.png", path: imgPath2 },
                { filename: "Reel1.mp4", path: videoPath },
            ],
        };

        await transporter.sendMail(mailOptions);
        console.log("Mail sent successfully");

        return res.status(201).json({ message: "Mail sent", influencer_id, data });
    } catch (err) {
        console.error("Error in controller:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const getInfluencerCount = async (req, res) => {
    try {
        const { count, error } = await supabase
            .from("influencers")
            .select("*", { count: "exact", head: true });

        if (error) throw error;

        return res.status(200).json({ count });
    } catch (err) {
        console.error("Count error:", err);
        return res.status(500).json({ error: "Could not fetch count" });
    }
};

// ✅ Get all influencers
const getAllInfluencers = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("influencers")
            .select("*")
            .order("created_at", { ascending: false }); // no limit

        if (error) throw error;

        return res.status(200).json(data);
    } catch (err) {
        console.error("Error fetching influencers:", err);
        return res.status(500).json({ error: "Failed to fetch all influencers" });
    }
};

module.exports = {
    registerInfluencer,
    getInfluencerCount,
    getAllInfluencers,
};
