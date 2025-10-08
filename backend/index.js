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
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ==============================
// 🔌 SOCKET.IO SETUP
// ==============================
io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.id}`);

  socket.on('joinRoom', (roomId) => socket.join(roomId));
  socket.on('leaveRoom', (roomId) => socket.leave(roomId));
  socket.on('sendMessage', (payload) => {
    if (payload?.roomId) {
      io.to(payload.roomId).emit('newMessage', payload.message);
    }
  });

  socket.on('disconnect', () => console.log(`❌ Socket disconnected: ${socket.id}`));
});

app.locals.io = io;

// ==============================
// 🌍 ROUTES
// ==============================
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);

// ==============================
// ☁️ CLOUDINARY + UPLOAD SETUP
// ==============================
let cloudinary = null;
try {
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('📦 Cloudinary configured');
} catch (e) {
  console.warn('⚠️ Cloudinary not installed or not configured — using local uploads');
}

// Local upload dir fallback
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Use memory storage for Cloudinary streaming
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const validCloudinary =
      process.env.NODE_ENV === 'production' &&
      cloudinary &&
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET;

    if (validCloudinary) {
      // Upload directly to Cloudinary
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'swift_emc_marketplace',
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return res.status(500).json({ error: 'Cloudinary upload failed' });
          }
          return res.json({ ok: true, url: result.secure_url });
        }
      );

      uploadStream.end(req.file.buffer);
    } else {
      // Save locally (development fallback)
      const fileName = Date.now() + '-' + req.file.originalname.replace(/[^a-z0-9.\-]/gi, '_');
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, req.file.buffer);
      const host = `${req.protocol}://${req.get('host')}`;
      const url = `${host}/uploads/${fileName}`;
      return res.json({ ok: true, url });
    }
  } catch (err) {
    console.error('Upload failed:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Serve static uploads in dev
app.use('/uploads', express.static(uploadDir));

// ==============================
// ❤️ HEALTHCHECK
// ==============================
app.get('/', (req, res) => {
  res.send({ ok: true, name: 'Swift EMC Marketplace API' });
});

// ==============================
// 🚀 DATABASE + SERVER START
// ==============================
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swift_emc';

(async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // 10s timeout
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('⚠️ MongoDB connection error:', err.message);
  } finally {
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  }
})();
