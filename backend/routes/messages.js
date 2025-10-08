const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const router = express.Router();

async function getUserFromHeader(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  try {
    const token = auth.replace('Bearer ', '');
    const data = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    return await User.findById(data.id);
  } catch {
    return null;
  }
}

function isAdminFromHeader(req){
  const secret = req.headers['x-admin-secret'] || '';
  return secret && secret === (process.env.ADMIN_PASSWORD || 'adminpass');
}

router.post('/', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { roomId, toId, text, listing } = req.body;
    if (!roomId || !text) return res.status(400).json({ error: 'Missing fields' });

    // Authorization: ensure user is participant of the room (for user: rooms) or allowed for listing rooms
    if (roomId.startsWith('user:')){
      const parts = roomId.replace('user:','').split('_');
      if (parts.length !== 2 || (String(parts[0]) !== String(user._id) && String(parts[1]) !== String(user._id))) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else if (roomId.startsWith('listing_')){
      // allow sending messages referencing a listing: it's acceptable for any logged-in user to message a listing owner
      // but ensure that if roomId is listing_<id> we attach listing id
      // no additional restriction here for initial message
    }

    let msg = new Message({ roomId, from: user._id, to: toId, text, listing });
    await msg.save();

    // populate from/to for client consumption
    const populated = await Message.findById(msg._id).populate('from', 'username').populate('to', 'username');

    const io = req.app.locals.io;
    if (io) {
      io.to(roomId).emit('newMessage', populated);
      io.emit('admin:newMessage', populated);
      // If message references a listing, also notify the listing owner room
      if (listing) {
        try {
          const L = require('../models/Listing');
          L.findById(listing).then(lDoc => {
            if (lDoc && lDoc.owner) {
              io.to(`user:${String(lDoc.owner)}`).emit('newMessage', populated);
            }
          }).catch(()=>{});
        } catch (e) {}
      }
    }

    res.json({ ok: true, msg: populated });
  } catch (err) {
    console.error('Message send error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Return list of conversations for the authenticated user
router.get('/conversations/list', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Find messages where user participated
    const msgs = await Message.find({ $or: [{ from: user._id }, { to: user._id }] })
      .sort({ createdAt: -1 })
      .populate('from', 'username profilePhotoUrl')
      .populate('to', 'username profilePhotoUrl')
      .lean();

    const seen = new Set();
    const convs = [];

    for (const m of msgs) {
      if (!m || !m.roomId) continue;
      if (seen.has(m.roomId)) continue;
      seen.add(m.roomId);

      // determine partner
      let partner = null;
      if (m.from && String(m.from._id) === String(user._id)) partner = m.to;
      else partner = m.from;

      // only include conversations that have another participant
      if (!partner) continue;

      convs.push({
        roomId: m.roomId,
        lastMessage: m.text,
        at: m.createdAt,
        partner: partner,
      });
    }

    res.json({ conversations: convs });
  } catch (err) {
    console.error('Conversations fetch error', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Fetch messages for a room
router.get('/:roomId', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    const roomId = req.params.roomId;
    // allow admins to view
    if (!user && !isAdminFromHeader(req)) return res.status(401).json({ error: 'Unauthorized' });

    // Authorization checks
    if (roomId.startsWith('user:')){
      const parts = roomId.replace('user:','').split('_');
      if (parts.length !== 2) return res.status(400).json({ error: 'Invalid room id' });
      if (!(isAdminFromHeader(req) || String(parts[0]) === String(user._id) || String(parts[1]) === String(user._id))) return res.status(403).json({ error: 'Forbidden' });
    } else if (roomId.startsWith('listing_')){
      // for listing rooms: allow listing owner or any participant who has messages in that room
      const listingId = roomId.replace('listing_','');
      try{
        const L = require('../models/Listing');
        const ldoc = await L.findById(listingId);
        if (!ldoc) return res.status(404).json({ error: 'Listing not found' });
        const isOwner = user && String(ldoc.owner) === String(user._id);
        if (!isOwner && !isAdminFromHeader(req)){
          // check if user has messages in that room
          const msgExists = await Message.exists({ roomId, $or: [{ from: user._id }, { to: user._id }] });
          if (!msgExists) return res.status(403).json({ error: 'Forbidden' });
        }
      }catch(e){ /* ignore and continue */ }
    }

    const msgs = await Message.find({ roomId }).sort({ createdAt: 1 }).populate('from','username').populate('to','username');
    res.json({ msgs });
  } catch (err) {
    console.error('Message fetch error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a single message (sender or recipient or admin)
router.delete('/:messageId', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    const isAdmin = isAdminFromHeader(req);
    if (!user && !isAdmin) return res.status(401).json({ error: 'Unauthorized' });
    const m = await Message.findById(req.params.messageId);
    if (!m) return res.status(404).json({ error: 'Message not found' });
    if (!isAdmin && String(m.from) !== String(user._id) && String(m.to) !== String(user._id)) return res.status(403).json({ error: 'Forbidden' });
    await m.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    console.error('Message delete error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete entire conversation (room) for participants or admin
router.delete('/conversations/:roomId', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    const isAdmin = isAdminFromHeader(req);
    if (!user && !isAdmin) return res.status(401).json({ error: 'Unauthorized' });
    const roomId = req.params.roomId;
    // check permission similar to GET
    if (roomId.startsWith('user:')){
      const parts = roomId.replace('user:','').split('_');
      if (!(isAdmin || String(parts[0]) === String(user._id) || String(parts[1]) === String(user._id))) return res.status(403).json({ error: 'Forbidden' });
    } else if (roomId.startsWith('listing_')){
      const listingId = roomId.replace('listing_','');
      const L = require('../models/Listing');
      const ldoc = await L.findById(listingId);
      const isOwner = ldoc && user && String(ldoc.owner) === String(user._id);
      if (!isOwner && !isAdmin){
        const msgExists = await Message.exists({ roomId, $or: [{ from: user._id }, { to: user._id }] });
        if (!msgExists) return res.status(403).json({ error: 'Forbidden' });
      }
    }
    await Message.deleteMany({ roomId });
    res.json({ ok: true });
  } catch (err) {
    console.error('Conversation delete error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
