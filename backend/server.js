const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer'); // NEW: Imported nodemailer
require('dotenv').config();

// const { OpenAI } = require('openai');
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const Company = require('./models/Company');
const SuperAdmin = require('./models/Superadmin');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// NEW: EMAIL TRANSPORTER SETUP
// ==========================================
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 465,
  secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendWelcomeEmail = async (toEmail, companyName, plainTextPassword) => {
  try {
    const mailOptions = {
      from: `"Org Chart Workspace" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `Welcome to Org Chart Workspace - ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #1B1730; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E4DEF5; border-radius: 12px;">
          <h2 style="color: #7C3AED;">Welcome to Org Chart Workspace!</h2>
          <p>Hello,</p>
          <p>An administrative workspace has been successfully provisioned for <strong>${companyName}</strong>.</p>
          <p>You can access your organization's dashboard using the credentials below:</p>
          <div style="background: #F1EDFB; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Dashboard URL:</strong> ${`https://orgchart.wowosapps.com`}</p>
            <p style="margin: 5px 0;"><strong>Login Email:</strong> ${toEmail}</p>
            <p style="margin: 5px 0;"><strong>Initial Password:</strong> ${plainTextPassword}</p>
          </div>
          <p><em>For security purposes, we highly recommend changing your password from the Settings menu upon your first login.</em></p>
          <br/>
          <p>Best regards,<br/><strong>The Org Chart Team</strong></p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${toEmail}`);
  } catch (error) {
    console.error("❌ Failed to send welcome email:", error);
  }
};

// ==========================================
// MIDDLEWARE: JWT Authentication Bouncer
// ==========================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
};


// ==========================================
// API ROUTES: Auth
// ==========================================

// 1. Unified Login Route
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const superAdmin = await SuperAdmin.findOne({ email: email.toLowerCase() });
    if (superAdmin && superAdmin.password === password) {
      const token = jwt.sign({ role: 'superadmin', adminId: superAdmin._id }, process.env.JWT_SECRET, { expiresIn: '12h' });
      return res.json({ token, role: 'superadmin' });
    }

    const company = await Company.findOne({ email: email.toLowerCase() });
    if (!company || company.password !== password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ role: 'user', companyId: company.id }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, role: 'user', companyId: company.id });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/companies/:id/force-password', authenticateToken, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });

  try {
    const company = await Company.findOne({ id: req.params.id });
    if (!company) return res.status(404).json({ message: "Company not found." });

    company.password = req.body.newPassword;
    await company.save();
    res.json({ message: "Password updated successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Verify Session
app.get('/api/verify', authenticateToken, (req, res) => {
  res.json({ role: req.user.role, companyId: req.user.companyId });
});

// 3. Change Password (For BOTH Admin and User)
app.put('/api/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    if (req.user.role === 'superadmin') {
      const admin = await SuperAdmin.findById(req.user.adminId);
      if (!admin || admin.password !== currentPassword) {
        return res.status(400).json({ message: "Incorrect current password." });
      }
      admin.password = newPassword;
      await admin.save();
      return res.json({ message: "Password updated successfully." });

    } else if (req.user.role === 'user') {
      const company = await Company.findOne({ id: req.user.companyId });
      if (!company || company.password !== currentPassword) {
        return res.status(400).json({ message: "Incorrect current password." });
      }
      company.password = newPassword;
      await company.save();
      return res.json({ message: "Password updated successfully." });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// API ROUTES: Data (Protected)
// ==========================================

app.get('/api/companies', authenticateToken, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });

  try {
    const companies = await Company.find().select('-password');
    res.json(companies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new company & SEND EMAIL
app.post('/api/companies', authenticateToken, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });

  try {
    const existing = await Company.findOne({ email: req.body.email });
    if (existing) return res.status(400).json({ message: 'Email already in use.' });

    const savedCompany = await new Company(req.body).save();

    // NEW: Fire off the welcome email immediately after saving to DB!
    // We don't await this so it doesn't slow down the frontend response time.
    sendWelcomeEmail(req.body.email, req.body.companyName, req.body.password);

    res.status(201).json(savedCompany);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get('/api/companies/:id', authenticateToken, async (req, res) => {
  if (req.user.role === 'user' && req.user.companyId !== req.params.id) {
    return res.status(403).json({ message: 'Forbidden: You cannot access this organization.' });
  }

  try {
    const company = await Company.findOne({ id: req.params.id });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json(company);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/companies/:id', authenticateToken, async (req, res) => {
  if (req.user.role === 'user' && req.user.companyId !== req.params.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const updatedCompany = await Company.findOneAndUpdate({ id: req.params.id }, req.body, { returnDocument: 'after' });
    res.json(updatedCompany);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/companies/:id', authenticateToken, async (req, res) => {
  try {
    await Company.findOneAndDelete({ id: req.params.id });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// API ROUTES: Public Share 
// ==========================================
app.get('/api/shared/:id', async (req, res) => {
  try {
    const company = await Company.findOne({ id: req.params.id });
    if (!company) {
      return res.status(404).json({ message: 'Organization not found.' });
    }

    const safeCompany = company.toObject();
    delete safeCompany.password;
    delete safeCompany.email;
    delete safeCompany._id;

    res.json(safeCompany);
  } catch (error) {
    console.error("Share Route Error:", error);
    res.status(500).json({ message: 'Failed to fetch shared organization.' });
  }
});

// ==========================================
// API ROUTES: Fetch Logged-in Admin's Company
// ==========================================
app.get('/api/my-company', authenticateToken, async (req, res) => {
  try {
    // FIX RE-APPLIED: Look up by companyId instead of email
    const company = await Company.findOne({ id: req.user.companyId });

    if (!company) {
      return res.status(404).json({ message: 'Organization not found.' });
    }

    const safeCompany = company.toObject();
    delete safeCompany.password;

    res.json(safeCompany);
  } catch (error) {
    console.error("Error fetching my-company:", error);
    res.status(500).json({ message: 'Failed to fetch organization data.' });
  }
});

// ==========================================
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    const adminCount = await SuperAdmin.countDocuments();
    if (adminCount === 0) {
      await SuperAdmin.create({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD
      });
      console.log('✅ Default Super Admin provisioned in database.');
    }

    app.listen(process.env.PORT || 5000, () => console.log('🚀 Server running'));
  })
  .catch((err) => console.error('❌ MongoDB connection error:', err));