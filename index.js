const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const path = require("path");   // 🔹 ADD THIS
const fs = require("fs");
const app = express();

app.use(cors());

// 🔔 Load Elite Cards expiry cron job
require("./cron/expireEliteCards");

// Import routes
const usersRoutes = require('./routes/usersRoutes');
const academicCoordinatorsRoutes = require('./routes/academicCoordinatorsRoutes');
const centersRoutes = require('./routes/centerRoutes');
const batchesRoutes = require('./routes/batchesRoutes');
const enrollmentsRoutes = require('./routes/enrollmentsRouter');
const financialPartnersRoutes = require('./routes/financialPartnersRoutes');
const managerRoutes = require('./routes/managerRoutes');
const notesRoutes = require('./routes/notesRoutes');
const statesRoutes = require('./routes/stateRoute');
const studentsRoutes = require('./routes/studentRoute');
const teachersRoutes = require('./routes/teacherRoutes');
const transactionsRoutes = require('./routes/transactionsRoutes');
const coursesRoutes = require('./routes/coursesRoutes');
const eliteCardRoutes = require('./routes/eliteCardRoutes');
const cardActivationsRoutes = require("./routes/cardActivationsRoutes");
const influencerRoutes = require("./routes/influencerRoutes");
const paymentRoutes = require('./routes/paymentRoutes');
const cardAdminRoutes = require("./routes/cardAdminRoutes");
const leadsRoutes = require("./routes/leadsRoutes");
const tutorInfoRoutes = require("./routes/tutorInfoRoute");
const demoRoutes = require("./routes/demoRoutes");
const subTeacherRoutes = require("./routes/subTeacherRoutes");
const academicNotificationsRoutes = require("./routes/academicNotificationsRoutes");
const managerNotificationsRoutes = require("./routes/managerNotificationsRoutes");
const adminNotificationsRoutes = require("./routes/adminNotificationsRoutes");
const financeNotificationsRoutes = require("./routes/financeNotificationsRoutes");
const stateNotificationsRoutes = require("./routes/stateNotificationsRoutes");
const centerNotificationsRoutes = require("./routes/centerNotificationsRoutes");
const resourceNotificationsRoutes = require("./routes/resourceNotificationsRoutes");
const cardAdminNotificationsRoutes = require("./routes/cardAdminNotificationsRoutes");




app.use(
  '/api/payments/razorpay-webhook',
  express.raw({ type: 'application/json' }),
  paymentRoutes
);

// 2️⃣ For all other routes, use JSON parsing
app.use(bodyParser.json());


// Mount all routes under a common API prefix
// IMPORTANT: Mount specific routes BEFORE generic routes to avoid conflicts
app.use("/api/tutor-info", tutorInfoRoutes);
app.use("/api/cards", cardActivationsRoutes);
app.use("/api/leads", leadsRoutes);
app.use('/api', usersRoutes);
app.use('/api', academicCoordinatorsRoutes);
app.use('/api', centersRoutes);
app.use("/api", centerNotificationsRoutes);
app.use('/api', batchesRoutes);
app.use('/api', enrollmentsRoutes);
app.use('/api', financialPartnersRoutes);
app.use('/api', managerRoutes);
app.use('/api', notesRoutes);
app.use('/api', statesRoutes);
app.use('/api', studentsRoutes);
app.use('/api', teachersRoutes);
app.use('/api', transactionsRoutes);
app.use('/api', coursesRoutes);
app.use('/api', eliteCardRoutes);
app.use("/api", influencerRoutes);
app.use("/api", cardAdminRoutes);
app.use("/api", demoRoutes);
app.use("/api", subTeacherRoutes);
app.use("/api", academicNotificationsRoutes);
app.use("/api", managerNotificationsRoutes);
app.use("/api", adminNotificationsRoutes);
app.use("/api/finance-notifications", financeNotificationsRoutes);
app.use("/api", stateNotificationsRoutes);
app.use("/api", resourceNotificationsRoutes);
app.use("/api/card-admin", cardAdminNotificationsRoutes);


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Listing Service Backend is running' });
});


// Start the server
const PORT = process.env.PORT || 3008;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
