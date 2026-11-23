const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const catalogController = require('../controllers/catalogController');

// 1. Auth & Onboarding with OTP
router.post('/auth/send-otp', vendorController.sendOtp);
router.post('/auth/verify-otp', vendorController.verifyOtp);
router.post('/auth/register', vendorController.registerVendor);
router.post('/auth/login', vendorController.loginVendor);

// 2. Profile & Open/Close Store Toggle
router.get('/profile', vendorController.getProfile);
router.put('/profile', vendorController.updateProfile);
router.patch('/profile/status', vendorController.toggleStoreStatus);

// 3. Dashboard Analytics
router.get('/dashboard/stats', vendorController.getDashboardStats);

// 4. Order Management & Customer Service OTP Verification
router.get('/orders', vendorController.getOrders);
router.post('/orders', vendorController.createOrder);
router.patch('/orders/:id/status', vendorController.updateOrderStatus);
router.post('/orders/:id/verify-service-otp', vendorController.verifyServiceOtp);

// 5. Product / Menu Catalog Management
router.get('/products', vendorController.getProducts);
router.post('/products', vendorController.createProduct);
router.put('/products/:id', vendorController.updateProduct);
router.delete('/products/:id', vendorController.deleteProduct);

// 6. Dynamic Categories & Subcategories / Services (from Admin)
router.get('/categories', catalogController.getCategories);
router.get('/subcategories', catalogController.getSubcategories);

// 7. Sales, Earnings & Reviews
router.get('/earnings', vendorController.getEarnings);
router.get('/reviews', vendorController.getReviews);

module.exports = router;
