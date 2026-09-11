const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const Company = require('./models/Company');
const SuperAdmin = require('./models/Superadmin');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// MIDDLEWARE: JWT Authentication Bouncer
// ==========================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token.' });
    req.user = user; // Attach the decoded user payload to the request
    next();
  });
};

// ==========================================
// API ROUTES: AI Generation
// ==========================================
app.post('/api/generate-kpi', authenticateToken, async (req, res) => {
  const { companyName, role } = req.body;
  
  if (!role) {
    return res.status(400).json({ message: "A Title/Designation is required for AI suggestions." });
  }

  // Instruct GPT-4o to return exactly the JSON format we need
  const prompt = `You are an expert HR consultant. Based on the following details, suggest appropriate Key Result Areas (KRAs), Key Performance Indicators (KPIs), and a meeting Cadence for this role. Keep points concise (max 1 sentence each).
  
  Organization Context: ${companyName || 'A general business'}
  Role/Designation: ${role}
  
  Return ONLY a valid JSON object in this exact format, with 3-5 string points per array:
  {
    "kras": ["Point 1", "Point 2",...],
    "kpis": ["Point 1", "Point 2",....],
    "cadence": ["Point 1", "Point 2",...]
  }`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" } // Forces strict JSON response
    });
    
    const data = JSON.parse(completion.choices[0].message.content);
    res.json(data);
  } catch (error) {
    console.error("OpenAI Error:", error);
    res.status(500).json({ message: "Failed to connect to OpenAI API." });
  }
});

// ==========================================
// API ROUTES: Auth
// ==========================================

// 1. Unified Login Route
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check for Super Admin in DB
    const superAdmin = await SuperAdmin.findOne({ email: email.toLowerCase() });
    if (superAdmin && superAdmin.password === password) {
      // Include adminId in token so we can find them later for password changes
      const token = jwt.sign({ role: 'superadmin', adminId: superAdmin._id }, process.env.JWT_SECRET, { expiresIn: '12h' });
      return res.json({ token, role: 'superadmin' });
    }

    // Check for Standard User
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

// Get all companies (Superadmin only)
app.get('/api/companies', authenticateToken, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });
  
  try {
    const companies = await Company.find().select('-password');
    res.json(companies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new company (Superadmin only)
app.post('/api/companies', authenticateToken, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });

  try {
    const existing = await Company.findOne({ email: req.body.email });
    if (existing) return res.status(400).json({ message: 'Email already in use.' });

    const savedCompany = await new Company(req.body).save();
    res.status(201).json(savedCompany);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get a specific company by ID
app.get('/api/companies/:id', authenticateToken, async (req, res) => {
  // Users can only view their own data. Superadmins can view anyone's.
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

// Update a company
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

// Delete a company
app.delete('/api/companies/:id', authenticateToken, async (req, res) => {
  try {
    await Company.findOneAndDelete({ id: req.params.id });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Seed default admin if none exists
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