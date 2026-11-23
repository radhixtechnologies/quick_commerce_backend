const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const customerRoutes = require('./customerRoutes');
const vendorRoutes = require('./vendorRoutes');
const deliveryRoutes = require('./deliveryRoutes');
const orderRoutes = require('./orderRoutes');
const catalogRoutes = require('./catalogRoutes');
const deliveryRulesRoutes = require('./deliveryRulesRoutes');
const financeRoutes = require('./financeRoutes');
const adminRoutes = require('./adminRoutes');
const aiRoutes = require('./aiRoutes');

router.use('/auth', authRoutes);
router.use('/customer', customerRoutes);
router.use('/vendor', vendorRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/orders', orderRoutes);
router.use('/catalog', catalogRoutes);
router.use('/delivery-rules', deliveryRulesRoutes);
router.use('/finance', financeRoutes);
router.use('/admin', adminRoutes);
router.use('/ai', aiRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Quick Commerce Multi-Vendor API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
