// backend/routes/upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// configure multer to store files on disk (development)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname)
    const name = Date.now() + '-' + Math.random().toString(36).slice(2,10) + ext
    cb(null, name)
  }
});
const upload = multer({ storage });

router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    // Provide a URL pointing to the static uploads path
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  } catch (e) {
    console.error('upload error', e);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
