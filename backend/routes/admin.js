const express = require('express');
const Listing = require('../models/Listing');
const User = require('../models/User');
const Message = require('../models/Message');
const router = express.Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminpass';
const ADMIN_SECRET_LINK = process.env.ADMIN_SECRET_LINK || '/Adminpanel';

// Simple admin auth middleware
function adminAuth(req, res, next) {
  const secret = req.headers['x-admin-secret'] || req.query.secret;
  if (secret === ADMIN_PASSWORD) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// Admin login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Missing credentials' });
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD)
    return res.json({ ok: true, secret: ADMIN_PASSWORD });
  return res.status(401).json({ error: 'Invalid admin credentials' });
});

// Fetch pending listings
router.get('/listings', adminAuth, async (req, res) => {
  const pending = await Listing.find({ approved: false }).populate(
    'owner',
    'username email'
  );
  res.json({ pending });
});

// Approve listing
router.post('/listings/:id/approve', adminAuth, async (req, res) => {
  const l = await Listing.findById(req.params.id);
  if (!l) return res.status(404).json({ error: 'Listing not found' });
  l.approved = true;
  await l.save();
  res.json({ ok: true, listing: l });
});

// Reject/delete listing
router.post('/listings/:id/reject', adminAuth, async (req, res) => {
  const l = await Listing.findById(req.params.id);
  if (!l) return res.status(404).json({ error: 'Listing not found' });
  await l.deleteOne();
  res.json({ ok: true });
});

// Delete listing (admin)
router.delete('/listings/:id', adminAuth, async (req, res) => {
  const l = await Listing.findById(req.params.id);
  if (!l) return res.status(404).json({ error: 'Listing not found' });
  await l.deleteOne();
  res.json({ ok: true });
});

// List all listings
router.get('/listings/all', adminAuth, async (req, res) => {
  const listings = await Listing.find().populate('owner','username email').limit(500);
  res.json({ listings });
});

// Get all reviews across listings
router.get('/reviews', adminAuth, async (req, res) => {
  try{
    const results = [];
    const listings = await Listing.find({ 'reviews.0': { $exists: true } }).select('title reviews');
    for(const l of listings){
      for(const r of l.reviews || []){
        results.push({ listingId: l._id, listingTitle: l.title, review: r });
      }
    }
    res.json({ reviews: results });
  }catch(err){ console.error('reviews fetch error', err); res.status(500).json({ error: 'Server error' }) }
});

// Delete a review by its subdocument id
router.delete('/reviews/:reviewId', adminAuth, async (req, res) => {
  try{
    const reviewId = req.params.reviewId;
    const listing = await Listing.findOne({ 'reviews._id': reviewId });
    if (!listing) return res.status(404).json({ error: 'Review not found' });
    listing.reviews = listing.reviews.filter(r=> String(r._id) !== String(reviewId));
    await listing.save();
    res.json({ ok: true });
  }catch(err){ console.error('delete review error', err); res.status(500).json({ error: 'Server error' }) }
});

// Find user by username
router.get('/users', adminAuth, async (req, res) => {
  const { username } = req.query;
  if (!username)
    return res.status(400).json({ error: 'Missing username query param' });
  const user = await User.findOne({ username }).select(
    '-passwordHash -securityAnswerHash'
  );
  if (!user) return res.status(404).json({ error: 'User not found' });
  const listings = await Listing.find({ owner: user._id }).limit(200);
  res.json({ user, listings, purchases: [] });
});

// List all users (paginated)
router.get('/users/all', adminAuth, async (req, res) => {
  const page = Math.max(0, parseInt(req.query.page || '0', 10));
  const limit = Math.min(200, parseInt(req.query.limit || '50', 10));
  const users = await User.find().select('-passwordHash -securityAnswerHash').skip(page * limit).limit(limit).lean();
  res.json({ users });
});

// Delete a user and their listings/messages
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error: 'User not found' });
    // delete listings
    await Listing.deleteMany({ owner: u._id });
    // delete messages where user was participant
    await Message.deleteMany({ $or: [{ from: u._id }, { to: u._id }] });
    await u.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    console.error('Admin delete user error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Analytics overview
router.get('/analytics', adminAuth, async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalListings = await Listing.countDocuments();
  const pendingListings = await Listing.countDocuments({ approved: false });
  const totalMessages = await Message.countDocuments();
  const uptime = process.uptime();
  const mem = process.memoryUsage();
  res.json({
    totalUsers,
    totalListings,
    pendingListings,
    totalMessages,
    uptime,
    memory: mem,
  });
});

// View messages (by roomId or userId)
router.get('/messages', adminAuth, async (req, res) => {
  const { roomId, userId } = req.query;
  const filter = {};
  if (roomId) filter.roomId = roomId;
  if (userId) filter.$or = [{ from: userId }, { to: userId }];
  const msgs = await Message.find(filter)
    .sort({ createdAt: 1 })
    .populate('from', 'username')
    .populate('to', 'username');
  res.json({ msgs });
});

// recent message rooms: returns recent rooms with last message and count
router.get('/recent-messages', adminAuth, async (req, res) => {
  try {
    // get distinct roomIds
    const rooms = await Message.distinct('roomId');
    // for each room, get last message and count
    const results = [];
    for (const roomId of rooms) {
      const last = await Message.findOne({ roomId }).sort({ createdAt: -1 }).populate('from', 'username').populate('to', 'username');
      const count = await Message.countDocuments({ roomId });
      if (last) results.push({ roomId, lastMessage: last, count });
    }
    // sort by lastMessage.createdAt desc
    results.sort((a,b)=> new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
    res.json({ rooms: results });
  } catch (err) {
    console.error('recent-messages error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin send reply
router.post('/messages/reply', adminAuth, async (req, res) => {
  const { roomId, toId, text, listing } = req.body;
  if (!roomId || !toId || !text)
    return res.status(400).json({ error: 'Missing fields' });
  const msg = new Message({
    roomId,
    // mark admin as a pseudo-sender; from:null was used previously but some clients expect a 'from' object
    from: null,
    to: toId,
    text,
    listing: listing || null,
  });
  await msg.save();
  const io = req.app.locals.io;
  if (io) {
    io.to(roomId).emit('newMessage', msg);
    io.emit('admin:newMessage', msg);
  }
  res.json({ ok: true, msg });
});

module.exports = router;
