require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const listingRoutes = require('./routes/listings');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// simple socket.io setup for instant messaging
io.on('connection', (socket) => {
  console.log('socket connected', socket.id);
  socket.on('joinRoom', (roomId) => socket.join(roomId));
  socket.on('leaveRoom', (roomId) => socket.leave(roomId));
  socket.on('sendMessage', (payload) => {
    // payload should include roomId and message object
    if (payload && payload.roomId) {
      io.to(payload.roomId).emit('newMessage', payload.message);
    }
  });
  socket.on('disconnect', () => {});
});

// expose io to routes via app.locals
app.locals.io = io;

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);

// serve healthcheck
app.get('/', (req, res) => {
  res.send({ ok: true, name: 'Swift EMC Marketplace API' });
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swift_emc')
  .then(() => {
    console.log('MongoDB connected');
    server.listen(PORT, () => console.log('Server running on', PORT));
  })
  .catch(err => {
    console.error('Mongo connect error', err);
    server.listen(PORT, () => console.log('Server running without DB on', PORT));
  });
