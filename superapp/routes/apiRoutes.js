const express = require('express');
const router = express.Router();

const upload = require('../middlewares/uploadMiddleware');
const authController = require('../controllers/authController');
const vendorController = require('../controllers/vendorController');
const deliveryController = require('../controllers/deliveryController');
const orderController = require('../controllers/orderController');
const catalogController = require('../controllers/catalogController');
const contactController = require('../controllers/contactController');

// 1. Health & Status
router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Multi-Service Super App Platform API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 2. Auth & OTP Verification
router.post('/auth/send-otp', authController.sendOtp);
router.post('/auth/verify-otp', authController.verifyOtp);
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/profile', authController.getProfile);

// 3. Vendor Registration & Listing
router.post('/vendor/register', upload.single('kyc_document'), vendorController.registerVendor);
router.get('/vendors', vendorController.getVendors);

// 4. Delivery Partner Registration & Management
router.post('/delivery-partner/register', upload.single('license_document'), deliveryController.registerDeliveryPartner);
router.get('/delivery-partners', deliveryController.getRiders);
router.patch('/delivery-partners/:id/toggle-online', deliveryController.toggleOnline);

// 5. Landing Page Contact / Leads
router.post('/contact', contactController.submitContact);
router.get('/contact', contactController.getContacts);

// 6. Super App Catalog & Services
router.get('/services', catalogController.getServices);
router.get('/categories', catalogController.getCategories);

// 7. Orders & End-to-End Fulfillment Flow
router.post('/orders', orderController.createOrder);
router.get('/orders', orderController.getRecentOrders);
router.get('/orders/:id', orderController.getOrderDetails);
router.patch('/orders/:id/pickup', upload.single('pickup_photo'), orderController.pickupOrder);
router.patch('/orders/:id/deliver', upload.single('delivery_photo'), orderController.deliverOrder);

// 8. Standalone File & Prescription Upload Endpoint
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  res.json({
    success: true,
    message: 'File uploaded successfully',
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
});

module.exports = router;
