require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const authRoutes = require('./routes/auth');
const listingRoutes = require('./routes/listings');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET','POST','PUT','DELETE'],
    credentials: true
  }
});
app.locals.io = io;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

io.on('connection', (socket) => {
  console.log('✅ Socket connected:', socket.id);
  socket.on('joinRoom', (roomId) => { if (roomId) socket.join(roomId); });
  socket.on('leaveRoom', (roomId) => { if (roomId) socket.leave(roomId); });
  socket.on('sendMessage', (payload) => {
    if (payload && payload.roomId) {
      io.to(payload.roomId).emit('newMessage', payload.message);
      io.emit('admin:newMessage', payload.message);
    }
  });
  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);

// Upload handling
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const safe = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, safe);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const host = `${req.protocol}://${req.get('host')}`;
    const url = `${host}/uploads/${req.file.filename}`;
    res.json({ ok: true, url });
  } catch (err) {
    console.error('Upload error', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Serve uploads
app.use('/uploads', express.static(uploadDir));

// Healthcheck
app.get('/', (req, res) => {
  res.json({ ok: true, name: 'Swift EMC Marketplace API', uptime: process.uptime() });
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swift_emc';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    server.listen(PORT, () => console.log(`⚠️ Server running without DB on port ${PORT}`));
  });

// Shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Server shutting down...');
  server.close(() => process.exit(0));
});
