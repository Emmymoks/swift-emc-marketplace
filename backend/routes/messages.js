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

router.post('/', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { roomId, toId, text, listing } = req.body;
    if (!roomId || !text) return res.status(400).json({ error: 'Missing fields' });

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
    const msgs = await Message.find({ roomId: req.params.roomId }).sort({
      createdAt: 1,
    });
    res.json({ msgs });
  } catch (err) {
    console.error('Message fetch error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
