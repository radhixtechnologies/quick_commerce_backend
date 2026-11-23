const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${sanitizedBase}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

// Single file upload endpoint (accepts 'file', 'image', or 'document' field name)
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (req.file) {
      const publicUrl = `/uploads/${req.file.filename}`;
      const fullUrl = `${req.protocol}://${req.get('host')}${publicUrl}`;
      return res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        url: publicUrl,
        full_url: fullUrl,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
    }

    // Check for base64 payload in JSON
    if (req.body && (req.body.base64 || req.body.image_base64)) {
      const base64Data = req.body.base64 || req.body.image_base64;
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let ext = '.jpg';
      let buffer;

      if (matches && matches.length === 3) {
        const mime = matches[1];
        if (mime.includes('png')) ext = '.png';
        else if (mime.includes('pdf')) ext = '.pdf';
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(base64Data, 'base64');
      }

      const filename = `doc-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, buffer);

      const publicUrl = `/uploads/${filename}`;
      const fullUrl = `${req.protocol}://${req.get('host')}${publicUrl}`;
      return res.status(200).json({
        success: true,
        message: 'Base64 document saved successfully',
        url: publicUrl,
        full_url: fullUrl,
        filename
      });
    }

    return res.status(400).json({ success: false, message: 'No file or base64 data provided in upload request' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Alias for vendor document upload
router.post('/document', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No document file provided' });
  }
  const publicUrl = `/uploads/${req.file.filename}`;
  const fullUrl = `${req.protocol}://${req.get('host')}${publicUrl}`;
  res.json({
    success: true,
    message: 'KYC Document uploaded successfully',
    url: publicUrl,
    full_url: fullUrl,
    filename: req.file.filename
  });
});

module.exports = router;
