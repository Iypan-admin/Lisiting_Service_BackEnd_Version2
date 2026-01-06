const nodemailer = require("nodemailer");
const axios = require("axios");

// ✅ Advanced Configuration
const MAIL_CONFIG = {
  retryAttempts: 3,
  retryDelay: 2000, // 2 seconds
  timeout: 30000, // 30 seconds
  enableLogging: true,
};

// ✅ Setup Transporter with Advanced Options
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateLimit: 14, // Gmail limit: 500 emails/day per user
  debug: process.env.NODE_ENV === "development",
  logger: process.env.NODE_ENV === "development",
});

// ✅ Verify transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Mail transporter verification failed:", error);
  } else {
    console.log("✅ Mail server is ready to send messages");
  }
});

// ✅ Advanced Logging System
const logger = {
  info: (message, data = {}) => {
    if (MAIL_CONFIG.enableLogging) {
      console.log(`📧 [MAIL] ${message}`, Object.keys(data).length > 0 ? JSON.stringify(data) : "");
    }
  },
  error: (message, error = {}) => {
    console.error(`❌ [MAIL ERROR] ${message}`, error.message || error);
  },
  success: (message, data = {}) => {
    if (MAIL_CONFIG.enableLogging) {
      console.log(`✅ [MAIL SUCCESS] ${message}`, Object.keys(data).length > 0 ? JSON.stringify(data) : "");
    }
  },
};

// ✅ Email Validation
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ✅ Retry Mechanism with Exponential Backoff
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryOperation(operation, maxAttempts = MAIL_CONFIG.retryAttempts) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        const delay = MAIL_CONFIG.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        logger.info(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

// ✅ Modern Email Template Base Styles
const getBaseStyles = () => `
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f4f4f4;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
      border-radius: 0;
    }
    .email-header h1 {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 10px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .email-header .subtitle {
      color: #f0f0f0;
      font-size: 16px;
      margin-top: 5px;
    }
    .email-body {
      padding: 40px 30px;
    }
    .welcome-section {
      margin-bottom: 30px;
    }
    .greeting {
      font-size: 20px;
      color: #2c3e50;
      margin-bottom: 15px;
      font-weight: 600;
    }
    .intro-text {
      font-size: 16px;
      color: #555555;
      margin-bottom: 25px;
      line-height: 1.8;
    }
    .card-section {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      border-radius: 12px;
      padding: 25px;
      margin: 30px 0;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    .card-section.primary {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }
    .card-section.success {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    }
    .card-section.premium {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
    }
    .card-title {
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 20px;
      text-align: center;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .benefits-list {
      list-style: none;
      padding: 0;
    }
    .benefits-list li {
      color: #ffffff;
      padding: 12px 0;
      font-size: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
    }
    .benefits-list li:last-child {
      border-bottom: none;
    }
    .benefits-list li:before {
      content: "✓";
      background: rgba(255,255,255,0.3);
      color: #ffffff;
      font-weight: bold;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      flex-shrink: 0;
    }
    .card-number-badge {
      background: rgba(255,255,255,0.25);
      padding: 15px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
      backdrop-filter: blur(10px);
    }
    .card-number-badge .label {
      color: #ffffff;
      font-size: 14px;
      margin-bottom: 8px;
      opacity: 0.9;
    }
    .card-number-badge .number {
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 2px;
    }
    .section {
      margin: 30px 0;
    }
    .section-title {
      font-size: 20px;
      color: #2c3e50;
      margin-bottom: 15px;
      font-weight: 600;
      padding-bottom: 10px;
      border-bottom: 3px solid #667eea;
      display: inline-block;
    }
    .steps-list {
      counter-reset: step-counter;
      list-style: none;
      padding: 0;
    }
    .steps-list li {
      counter-increment: step-counter;
      padding: 15px 15px 15px 60px;
      margin-bottom: 15px;
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      border-radius: 6px;
      position: relative;
      font-size: 15px;
      color: #555555;
    }
    .steps-list li:before {
      content: counter(step-counter);
      position: absolute;
      left: 15px;
      top: 15px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
    }
    .terms-section {
      background: #f8f9fa;
      padding: 25px;
      border-radius: 8px;
      border-left: 4px solid #e74c3c;
      margin: 25px 0;
    }
    .terms-section h3 {
      color: #e74c3c;
      font-size: 18px;
      margin-bottom: 15px;
      font-weight: 600;
    }
    .terms-list {
      list-style: none;
      padding: 0;
    }
    .terms-list li {
      padding: 10px 0;
      color: #555555;
      font-size: 14px;
      border-bottom: 1px solid #e0e0e0;
      padding-left: 25px;
      position: relative;
    }
    .terms-list li:last-child {
      border-bottom: none;
    }
    .terms-list li:before {
      content: "•";
      color: #e74c3c;
      font-weight: bold;
      position: absolute;
      left: 0;
      font-size: 20px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 10px 5px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      transition: transform 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
    }
    .contact-section {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin: 25px 0;
    }
    .contact-info {
      color: #555555;
      font-size: 15px;
      margin: 8px 0;
    }
    .contact-info a {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
    }
    .email-footer {
      background: #2c3e50;
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .email-footer p {
      margin: 8px 0;
      font-size: 14px;
      color: #ecf0f1;
    }
    .email-footer .brand {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 10px;
      color: #ffffff;
    }
    .email-footer a {
      color: #ecf0f1;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background: linear-gradient(to right, transparent, #ddd, transparent);
      margin: 30px 0;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      .email-body {
        padding: 25px 20px !important;
      }
      .email-header {
        padding: 30px 20px !important;
      }
      .card-section {
        padding: 20px 15px !important;
      }
      .steps-list li {
        padding-left: 50px !important;
      }
      .cta-button {
        display: block;
        text-align: center;
        margin: 10px 0 !important;
      }
    }
  </style>
`;

// ✅ Template Helper Functions
const createEmailTemplate = (headerTitle, headerSubtitle, bodyContent) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headerTitle}</title>
  ${getBaseStyles()}
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>${headerTitle}</h1>
      ${headerSubtitle ? `<p class="subtitle">${headerSubtitle}</p>` : ''}
    </div>
    
    <div class="email-body">
      ${bodyContent}
    </div>
    
    <div class="email-footer">
      <p class="brand">Indian School for Modern Languages</p>
      <p>Empowering Global Communication</p>
      <p style="margin-top: 15px;">
        <a href="https://www.indianschoolformodernlanguages.com">Visit Our Website</a> | 
        <a href="mailto:elitemembership.isml@gmail.com">Contact Support</a>
      </p>
      <p style="margin-top: 20px; font-size: 12px; color: #95a5a6;">
        This is an automated email. Please do not reply to this message.
      </p>
    </div>
  </div>
</body>
</html>
`;

// ✅ Enhanced Email Templates
const mailTemplates = {
  EduPass: (name, cardNumber) => ({
    subject: "🎉 Welcome to ISML! Your EduPass is Ready – Next Steps Inside",
    html: createEmailTemplate(
      "Welcome to ISML!",
      "Your EduPass is Ready",
      `
        <div class="welcome-section">
          <p class="greeting">Hi ${name},</p>
          <p class="intro-text">
            Greetings from the <strong>Indian School for Modern Languages</strong> Family! 
            We're overjoyed to welcome you to our community of passionate learners.
          </p>
        </div>

        <div class="card-section primary">
          <h2 class="card-title">🎉 You're now an Elite Member with ISML EduPass</h2>
          <div class="card-number-badge">
            <div class="label">Your EduPass ID</div>
            <div class="number">${cardNumber}</div>
          </div>
          <ul class="benefits-list">
            <li>Validity: <strong>1 Year</strong></li>
            <li>Language Access: <strong>Any 1 Language</strong></li>
            <li>Mode: <strong>Online Only</strong></li>
            <li>Flat <strong>10% Discount</strong> on ML & ID programs</li>
          </ul>
        </div>

        <div class="section">
          <h3 class="section-title">✨ Your EduPass Additional Benefits</h3>
          <ul class="benefits-list" style="color: #555;">
            <li style="color: #555; border-bottom-color: #ddd;">
              <span style="color: #667eea;">✓</span> Online Access
            </li>
            <li style="color: #555; border-bottom-color: #ddd;">
              <span style="color: #667eea;">✓</span> Flat 10% Course Discount
            </li>
            <li style="color: #555; border-bottom-color: #ddd;">
              <span style="color: #667eea;">✓</span> Academic Support (Past Papers)
            </li>
            <li style="color: #555;">
              <span style="color: #667eea;">✓</span> ISML Community Access
            </li>
          </ul>
        </div>

        <div class="section">
          <h3 class="section-title">📌 How to Join a Course</h3>
          <ol class="steps-list">
            <li>Choose any one language: <strong>French / German / Japanese</strong></li>
            <li>Select your program: <strong>ML / ID</strong></li>
            <li>Pick a day and time slot</li>
            <li>Call Admission Manager: <strong>73388 81781</strong> or 
              <a href="https://www.indianschoolformodernlanguages.com/courses" class="cta-button" style="margin-top: 10px;">Visit Our Website</a>
            </li>
          </ol>
        </div>

        <div class="terms-section">
          <h3>⚖️ Terms & Conditions</h3>
          <ul class="terms-list">
            <li>EduPass is non-transferable and valid for only one language.</li>
            <li>10% discount is applicable only while the card is active.</li>
            <li>EduPass does not include offline access, internships, or placement services.</li>
            <li>Discounts are only on base course fee, excluding GST/charges.</li>
            <li>Discount must be claimed before batch starts (not for ongoing batches).</li>
          </ul>
        </div>

        <div class="contact-section">
          <p class="contact-info">
            <strong>Need Help?</strong><br>
            Email: <a href="mailto:elitemembership.isml@gmail.com">elitemembership.isml@gmail.com</a><br>
            Call: <strong>93854 57322</strong>
          </p>
        </div>

        <p style="margin-top: 30px; font-size: 16px; color: #555; text-align: center;">
          Thank you for choosing ISML. Your language journey begins today! 
          We're here to support you every step of the way. 🌟
        </p>
      `
    ),
  }),

  ScholarPass: (name, cardNumber) => ({
    subject: "🎓 ISML ScholarPass Delivered – Start Learning Today",
    html: createEmailTemplate(
      "Congratulations!",
      "Your FREE ScholarPass is Here",
      `
        <div class="welcome-section">
          <p class="greeting">Hi ${name},</p>
          <p class="intro-text">
            Great news — your <strong>FREE ISML ScholarPass</strong> (worth ₹31,740) has just been issued!
          </p>
        </div>

        <div class="card-section success">
          <h2 class="card-title">🎓 What You Can Do With Your Pass</h2>
          <div class="card-number-badge">
            <div class="label">Your ScholarPass ID</div>
            <div class="number">${cardNumber}</div>
          </div>
          <ul class="benefits-list">
            <li>Access <strong>French, German & Japanese</strong> learning materials</li>
            <li>Practice with past exam papers</li>
            <li>Apply for certified internships & career support</li>
            <li>Get study-abroad preparation guidance</li>
            <li>Unlock exclusive ISML learning discounts</li>
          </ul>
        </div>

        <div class="section">
          <p style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <strong>🎁 Bonus:</strong> Want to help a friend? Forward them this link to claim their own ScholarPass:<br>
            <a href="https://forms.gle/f6o74twN3EBZsAm2A" style="color: #667eea; font-weight: 600;">https://forms.gle/f6o74twN3EBZsAm2A</a>
          </p>
        </div>

        <div class="section">
          <h3 class="section-title">📌 How to Start Using Your ScholarPass</h3>
          <ol class="steps-list">
            <li>Choose your languages across 2 years (Mode: <strong>Online or Offline</strong>).</li>
            <li>Select your preferred program:
              <ul style="margin-top: 10px; padding-left: 20px;">
                <li>Master a Language (ML)</li>
                <li>International Diploma (ID)</li>
                <li>Immersion (IMM)</li>
              </ul>
              <a href="https://www.indianschoolformodernlanguages.com/courses" class="cta-button">View Courses</a>
            </li>
            <li>Pick your day and time slot.</li>
            <li>For online class joining & support, contact our Admission Manager: <strong>+91 73388 81781</strong></li>
            <li>For offline center availability & joining, visit: 
              <a href="https://www.indianschoolformodernlanguages.com/centres">ISML Centres</a>
            </li>
          </ol>
        </div>

        <div class="terms-section">
          <h3>⚖️ Terms & Conditions</h3>
          <ul class="terms-list">
            <li>ScholarPass is valid for a period of 2 years from the activation date.</li>
            <li>Access is subject to course availability in your preferred format/location.</li>
            <li>Discounts apply only to the base course fee. GST and other statutory charges are not included.</li>
            <li>Discounts must be claimed before the batch begins and cannot be applied to ongoing batches.</li>
            <li>Only courses officially listed on ISML platforms are eligible for benefits.</li>
          </ul>
        </div>

        <p style="margin-top: 30px; font-size: 16px; color: #555; text-align: center;">
          We are delighted to have you onboard. Your journey to international opportunities starts today! 🌍✨
        </p>
      `
    ),
  }),

  InfinitePass: (name, cardNumber) => ({
    subject: "🌟 Welcome to ISML! Your InfinityPass is Now Active",
    html: createEmailTemplate(
      "Elite Membership Activated",
      "Your InfinityPass is Ready",
      `
        <div class="welcome-section">
          <p class="greeting">Hi ${name},</p>
          <p class="intro-text">
            Greetings from the <strong>Indian School for Modern Languages</strong> Family! 
            We're thrilled to welcome you to our community of passionate learners.
          </p>
        </div>

        <div class="card-section premium">
          <h2 class="card-title">🌟 You're now an Elite Member with ISML InfinityPass</h2>
          <div class="card-number-badge">
            <div class="label">Your InfinityPass ID</div>
            <div class="number">${cardNumber}</div>
          </div>
          <ul class="benefits-list">
            <li>Validity: <strong>3 Years</strong></li>
            <li>Language Access: <strong>All Current & Upcoming Languages</strong></li>
            <li>Mode: <strong>Online + Offline</strong></li>
            <li>Discounts: <strong>Up to 15%</strong> off all ISML programs & certifications</li>
          </ul>
        </div>

        <div class="section">
          <h3 class="section-title">✨ Your InfinityPass Additional Benefits</h3>
          <ul class="benefits-list" style="color: #555;">
            <li style="color: #555; border-bottom-color: #ddd;">
              <span style="color: #fa709a;">✓</span> Online & Offline Access
            </li>
            <li style="color: #555; border-bottom-color: #ddd;">
              <span style="color: #fa709a;">✓</span> Study Abroad Guidance
            </li>
            <li style="color: #555; border-bottom-color: #ddd;">
              <span style="color: #fa709a;">✓</span> 3-Month Certified Internship
            </li>
            <li style="color: #555;">
              <span style="color: #fa709a;">✓</span> Placement Assistance & Priority Support
            </li>
          </ul>
        </div>

        <div class="section">
          <h3 class="section-title">📌 How to Start Using Your InfinityPass</h3>
          <ol class="steps-list">
            <li>Choose your languages across 3 years (<strong>Online or Offline</strong>).</li>
            <li>Select your program: 
              <a href="https://www.indianschoolformodernlanguages.com/courses" class="cta-button">ML / ID / IMM</a>
            </li>
            <li>Pick your day & time slot</li>
            <li>For online support: Call <strong>73388 81781</strong></li>
            <li>For offline centres: 
              <a href="https://www.indianschoolformodernlanguages.com/centres">Check availability</a>
            </li>
          </ol>
        </div>

        <div class="terms-section">
          <h3>⚖️ Terms & Conditions</h3>
          <ul class="terms-list">
            <li>InfinityPass is valid 3 years from activation date.</li>
            <li>Access subject to availability (online/offline).</li>
            <li>Discounts apply only to base fee (GST excluded).</li>
            <li>Discounts must be claimed before batch starts.</li>
            <li>Internship/placement depend on performance & seats.</li>
            <li>Study Abroad guidance is advisory (not full admission/visa).</li>
          </ul>
        </div>

        <div class="contact-section">
          <p class="contact-info">
            <strong>Need Help?</strong><br>
            Email: <a href="mailto:elitemembership.isml@gmail.com">elitemembership.isml@gmail.com</a><br>
            Call: <strong>93854 57322</strong>
          </p>
        </div>

        <p style="margin-top: 30px; font-size: 16px; color: #555; text-align: center;">
          Thank you for choosing ISML. Your journey begins today! 🚀✨
        </p>
      `
    ),
  }),
};

// ✅ Download PDF from Supabase URL with Retry
async function downloadFile(url) {
  return await retryOperation(async () => {
    const response = await axios.get(url, { 
      responseType: "arraybuffer",
      timeout: MAIL_CONFIG.timeout,
    });
    return response.data;
  });
}

// ✅ Advanced Send Mail Function
exports.sendCardMail = async (to, cardName, nameOnPass, cardNumber, pdfUrl, options = {}) => {
  const startTime = Date.now();
  
  try {
    // Validate email
    if (!isValidEmail(to)) {
      throw new Error(`Invalid email address: ${to}`);
    }

    // Get template
    const templateFn = mailTemplates[cardName];
    if (!templateFn) {
      throw new Error(`Unknown card type: ${cardName}. Available types: ${Object.keys(mailTemplates).join(", ")}`);
    }

    logger.info(`Preparing email for ${cardName}`, { to, cardNumber });

    // Generate email content
    const { subject, html } = templateFn(nameOnPass, cardNumber);

    // Download PDF with retry
    let pdfBuffer = null;
    if (pdfUrl) {
      try {
        logger.info("Downloading PDF attachment", { pdfUrl });
        pdfBuffer = await downloadFile(pdfUrl);
        logger.success("PDF downloaded successfully");
      } catch (error) {
        logger.error("Failed to download PDF", error);
        if (options.requireAttachment) {
          throw new Error(`Failed to download PDF: ${error.message}`);
        }
        logger.info("Continuing without PDF attachment");
      }
    }

    // Prepare attachments
    const attachments = [];
    if (pdfBuffer) {
      attachments.push({
        filename: `${cardName}_${cardNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      });
    }

    // Send email with retry
    const mailOptions = {
      from: `"ISML Elite Membership" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      attachments,
      priority: options.priority || "normal",
      headers: {
        "X-Mailer": "ISML-Mailer",
        "X-Card-Type": cardName,
        "X-Card-Number": cardNumber,
      },
    };

    const result = await retryOperation(async () => {
      return await transporter.sendMail(mailOptions);
    });

    const duration = Date.now() - startTime;
    logger.success(`Email sent successfully`, { 
      to, 
      cardName, 
      messageId: result.messageId,
      duration: `${duration}ms`
    });

    return {
      success: true,
      messageId: result.messageId,
      to,
      cardName,
      duration,
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Failed to send email`, { 
      to, 
      cardName, 
      error: error.message,
      duration: `${duration}ms`
    });

    // Enhanced error handling
    if (error.code === "EAUTH") {
      throw new Error("SMTP authentication failed. Please check your credentials.");
    } else if (error.code === "ETIMEDOUT") {
      throw new Error("Email sending timed out. Please try again later.");
    } else if (error.responseCode === 535) {
      throw new Error("SMTP authentication error. Invalid username or password.");
    }

    throw error;
  }
};

// ✅ Batch Send Function
exports.sendBatchMails = async (mailList, options = {}) => {
  const results = {
    successful: [],
    failed: [],
    total: mailList.length,
  };

  logger.info(`Starting batch email send`, { total: results.total });

  for (const mailData of mailList) {
    try {
      const result = await exports.sendCardMail(
        mailData.to,
        mailData.cardName,
        mailData.nameOnPass,
        mailData.cardNumber,
        mailData.pdfUrl,
        options
      );
      results.successful.push(result);
      
      // Optional delay between emails to respect rate limits
      if (options.delayBetweenEmails) {
        await sleep(options.delayBetweenEmails);
      }
    } catch (error) {
      results.failed.push({
        to: mailData.to,
        cardName: mailData.cardName,
        error: error.message,
      });
    }
  }

  logger.info(`Batch email send completed`, {
    successful: results.successful.length,
    failed: results.failed.length,
  });

  return results;
};

// ✅ Test Email Function
exports.testMailConnection = async () => {
  try {
    await transporter.verify();
    logger.success("Mail server connection verified");
    return { success: true, message: "Mail server is ready" };
  } catch (error) {
    logger.error("Mail server connection failed", error);
    return { success: false, message: error.message };
  }
};

// ✅ Get Available Templates
exports.getAvailableTemplates = () => {
  return Object.keys(mailTemplates);
};
