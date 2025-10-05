const express = require('express');
const Listing = require('../models/Listing');
const User = require('../models/User');
const Message = require('../models/Message');
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

// search user by username and return basic info + their listings
router.get('/users', adminAuth, async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Missing username query param' });
  const user = await User.findOne({ username }).select('-passwordHash -securityAnswerHash');
  if (!user) return res.status(404).json({ error: 'User not found' });
  const listings = await Listing.find({ owner: user._id }).limit(200);
  // NOTE: this project does not include a purchases/orders model. Return listings as a proxy.
  res.json({ user, listings, purchases: [] });
});

// basic analytics summary for admin
router.get('/analytics', adminAuth, async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalListings = await Listing.countDocuments();
  const pendingListings = await Listing.countDocuments({ approved: false });
  const totalMessages = await Message.countDocuments();
  const uptime = process.uptime();
  const mem = process.memoryUsage();
  res.json({ totalUsers, totalListings, pendingListings, totalMessages, uptime, memory: mem });
});

// admin can read messages (by roomId or userId)
router.get('/messages', adminAuth, async (req, res) => {
  const { roomId, userId } = req.query;
  const filter = {};
  if (roomId) filter.roomId = roomId;
  if (userId) filter.$or = [{ from: userId }, { to: userId }];
  const msgs = await Message.find(filter).sort({ createdAt: 1 }).populate('from', 'username').populate('to', 'username');
  res.json({ msgs });
});

// admin can send/reply to a conversation without a user JWT
router.post('/messages/reply', adminAuth, async (req, res) => {
  const { roomId, toId, text, listing } = req.body;
  if (!roomId || !toId || !text) return res.status(400).json({ error: 'Missing fields' });
  const msg = new Message({ roomId, from: null, to: toId, text, listing: listing || null });
  await msg.save();
  const io = req.app.locals.io;
  if (io) io.to(roomId).emit('newMessage', msg);
  res.json({ ok: true, msg });
});

module.exports = router;
