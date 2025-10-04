const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const router = express.Router();

async function getUserFromHeader(req){
  const auth = req.headers.authorization;
  if (!auth) return null;
  try{
    const token = auth.replace('Bearer ', '');
    const data = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    return await User.findById(data.id);
  }catch(e){ return null; }
}

router.post('/', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { roomId, toId, text, listing } = req.body;
    const msg = new Message({ roomId, from: user._id, to: toId, text, listing });
    await msg.save();
    // broadcast via socket if available
    const io = req.app.locals.io;
    if (io) io.to(roomId).emit('newMessage', msg);
    res.json({ ok: true, msg });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:roomId', async (req, res) => {
  try {
    const msgs = await Message.find({ roomId: req.params.roomId }).sort({ createdAt: 1 });
    res.json({ msgs });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
