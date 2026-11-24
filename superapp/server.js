const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { initDB } = require('./config/db');
const apiRoutes = require('./routes/apiRoutes');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

const app = express();
const server = http.createServer(app);

// Initialize DB
initDB();

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Static uploads directory for proof photos and prescriptions
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// If frontend build is present, serve it statically
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

// Mount API routes
app.use('/api', apiRoutes);
app.use('/api/v1', apiRoutes);

// Welcome route
app.get('/api-info', (req, res) => {
  res.json({
    project: 'Multi-Service Super App Platform',
    version: '1.0.0',
    documentation: '/api/health',
    endpoints: [
      'POST /api/auth/send-otp',
      'POST /api/auth/verify-otp',
      'POST /api/vendor/register',
      'POST /api/delivery-partner/register',
      'POST /api/contact',
      'GET  /api/services',
      'GET  /api/categories',
      'POST /api/orders',
      'GET  /api/orders/:id',
      'PATCH /api/orders/:id/pickup',
      'PATCH /api/orders/:id/deliver',
      'POST /api/upload'
    ]
  });
});

// Single Page App fallback for frontend if built
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  const indexPath = path.join(frontendDist, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) next();
  });
});

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('================================================================');
  console.log(`🚀 Multi-Service Super App Backend running on http://localhost:${PORT}`);
  console.log(`📡 Health & Spec: http://localhost:${PORT}/api/health`);
  console.log(`📦 REST API Base:  http://localhost:${PORT}/api`);
  console.log('================================================================');
});

module.exports = { app, server };
