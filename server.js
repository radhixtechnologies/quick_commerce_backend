const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');
require('dotenv').config();

const apiRoutes = require('./routes/apiRoutes');
const { registerSocketHandlers } = require('./sockets/socketHandler');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});

// Register real-time Socket.IO event listeners
registerSocketHandlers(io);
app.set('io', io);

// Security and utility middlewares
app.use(
  helmet({
    contentSecurityPolicy: false // Allows admin panel CDN scripts (Chart.js, Icons, Google Fonts)
  })
);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Static files for Admin Web Panel & Uploads
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Direct route to Admin Panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// Direct route to Vendor Web Panel
app.get('/vendor', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'vendor', 'index.html'));
});

// Root Portal Hub
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Super App & Legacy API Routes
const superAppRoutes = require('./superapp/routes/apiRoutes');
app.use('/api', superAppRoutes);
app.use('/api/v1', apiRoutes);

// Error handling middlewares
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('================================================================');
  console.log(`🚀 Quick Commerce Backend running on http://localhost:${PORT}`);
  console.log(`💻 Responsive Admin Panel:       http://localhost:${PORT}/admin`);
  console.log(`⚡ Socket.IO Server active on:   ws://localhost:${PORT}`);
  console.log(`📦 REST API Base URL:           http://localhost:${PORT}/api/v1`);
  console.log('================================================================');
});
