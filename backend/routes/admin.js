const express = require('express');
const Listing = require('../models/Listing');
const User = require('../models/User');
const router = express.Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminpass';
const ADMIN_SECRET_LINK = process.env.ADMIN_SECRET_LINK || '/Adminpanel';

// middleware to protect admin (very simple)
function adminAuth(req, res, next){
  const secret = req.headers['x-admin-secret'] || req.query.secret;
  if (secret === ADMIN_PASSWORD || req.path === ADMIN_SECRET_LINK.replace('/','')) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// admin login via email/password (uses env values)
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) return res.json({ ok: true, secret: ADMIN_PASSWORD });
  return res.status(401).json({ error: 'Invalid admin credentials' });
});

router.get('/listings', adminAuth, async (req, res) => {
  const pending = await Listing.find({ approved: false }).populate('owner','username email');
  res.json({ pending });
});

router.post('/listings/:id/approve', adminAuth, async (req, res) => {
  const l = await Listing.findById(req.params.id);
  if (!l) return res.status(404).json({ error: 'Not found' });
  l.approved = true;
  await l.save();
  res.json({ ok: true, listing: l });
});

router.post('/listings/:id/reject', adminAuth, async (req, res) => {
  const l = await Listing.findById(req.params.id);
  if (!l) return res.status(404).json({ error: 'Not found' });
  await l.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
