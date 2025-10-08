require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Import routes
const authRoutes = require('./routes/auth');
const listingRoutes = require('./routes/listings');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);

// ============================
// Socket.IO Setup
// ============================
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================
// Socket Events (Realtime Messaging)
// ============================
io.on('connection', (socket) => {
  console.log('✅ Socket connected:', socket.id);

  socket.on('joinRoom', (roomId) => {
    if (roomId) socket.join(roomId);
  });

  socket.on('leaveRoom', (roomId) => {
    if (roomId) socket.leave(roomId);
  });

  socket.on('sendMessage', (payload) => {
    if (payload && payload.roomId) {
      io.to(payload.roomId).emit('newMessage', payload.message);
      io.emit('admin:newMessage', payload.message); // Notify admins
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);
  });
});

// Make io available to routes
app.locals.io = io;

// ============================
// Middleware and Routes
// ============================
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);

// ============================
// File Upload Handling
// ============================
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const safeName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Optional S3 configuration
let s3Client = null
let s3Bucket = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && s3Bucket) {
  try {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
    s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' })
    // attach to app locals so other modules could use it if needed
    app.locals.s3 = { client: s3Client, PutObjectCommand }
    console.log('✅ S3 uploads enabled')
  } catch (e) {
    console.warn('⚠️ Failed to initialize S3 client, falling back to local uploads', e)
    s3Client = null
  }
}

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // If S3 is configured, try to upload the file to S3 and return the S3 url
    if (s3Client) {
      try {
        const { PutObjectCommand } = require('@aws-sdk/client-s3')
        const key = `${Date.now()}-${req.file.filename}`
        const params = {
          Bucket: s3Bucket,
          Key: key,
          Body: require('fs').createReadStream(req.file.path),
          ContentType: req.file.mimetype,
          ACL: process.env.AWS_S3_ACL || 'public-read'
        }
        await s3Client.send(new PutObjectCommand(params))
        // Construct URL. If the bucket is in a specific endpoint (like S3 compatible storage), environment can provide S3_BASE_URL
        const baseUrl = process.env.S3_BASE_URL || `https://${s3Bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`
        const url = `${baseUrl}/${encodeURIComponent(key)}`
        // remove local temp file
        try{ fs.unlinkSync(req.file.path) }catch(e){}
        return res.json({ ok: true, url })
      } catch (e) {
        console.warn('S3 upload failed, falling back to local host storage', e)
        // fall through to local return
      }
    }

    // Fallback: return local file url
    const host = `${req.protocol}://${req.get('host')}`;
    const url = `${host}/uploads/${req.file.filename}`;
    res.json({ ok: true, url });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Serve uploaded images
app.use('/uploads', express.static(uploadDir));

// ============================
// Health Check Endpoint
// ============================
app.get('/', (req, res) => {
  res.json({
    ok: true,
    name: 'Swift EMC Marketplace API',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ============================
// MongoDB Connection & Server Start
// ============================
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swift_emc';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    server.listen(PORT, () => console.log(`⚠️ Server running without DB connection on port ${PORT}`));
  });

// ============================
// Graceful Shutdown Handling
// ============================
process.on('SIGTERM', () => {
  console.log('🛑 Server shutting down...');
  server.close(() => process.exit(0));
});
