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
