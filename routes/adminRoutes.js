const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { ROLES } = require('../config/constants');

// Middleware to secure all admin routes
router.use(authenticate, authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN));

// 4.1 Dashboard
router.get('/dashboard-kpis', adminController.getDashboardKPIs);
router.get('/dashboard/kpis', adminController.getDashboardKPIs);

// 4.2 Customer Management
router.get('/customers', adminController.getAllCustomers);
router.patch('/customers/:id/status', adminController.toggleCustomerStatus);

// 4.3 Vendor Management
router.get('/vendors', adminController.getAllVendors);
router.patch('/vendors/:id/approval', adminController.updateVendorApproval);
router.put('/vendors/:id/approval', adminController.updateVendorApproval);
router.patch('/vendors/:id/status', adminController.updateVendorApproval);
router.post('/vendors/:id/status', adminController.updateVendorApproval);
router.patch('/vendors/:id/documents', adminController.updateVendorDocumentStatus);
router.put('/vendors/:id/documents', adminController.updateVendorDocumentStatus);

// 4.4 Delivery Boy Management
router.get('/delivery-boys', adminController.getAllDeliveryBoys);
router.patch('/delivery-boys/:id/approval', adminController.updateDeliveryBoyApproval);

// 4.5 Category & Subcategory Management
router.get('/categories', adminController.getAllCategories);
router.post('/categories', adminController.createCategory);
router.patch('/categories/:id/status', adminController.toggleCategoryStatus);
router.delete('/categories/:id', adminController.deleteCategory);

router.get('/subcategories', adminController.getAllSubcategories);
router.post('/subcategories', adminController.createSubcategory);
router.patch('/subcategories/:id/status', adminController.toggleSubcategoryStatus);
router.delete('/subcategories/:id', adminController.deleteSubcategory);

// 4.6 Product Management
router.get('/products', adminController.getAllProducts);
router.post('/products', adminController.createProduct);
router.patch('/products/:id/status', adminController.toggleProductStatus);

// 4.7 Order Management
router.get('/orders', adminController.getAllOrders);
router.patch('/orders/:orderId/status', adminController.adminChangeOrderStatus);

// 4.11 Coupons & Offers
router.get('/coupons', adminController.getAllCoupons);
router.post('/coupons', adminController.createCoupon);

// 4.12 Banners
router.get('/banners', adminController.getAllBanners);
router.post('/banners', adminController.createBanner);
router.patch('/banners/:id/status', adminController.toggleBannerStatus);
router.delete('/banners/:id', adminController.deleteBanner);

// 4.13 Notifications
router.post('/notifications/broadcast', adminController.sendBroadcastNotification);

// 4.14 Reports Engine
router.get('/reports/:type', adminController.getReport);

// 4.15 Reviews & Ratings
router.get('/reviews', adminController.getAllReviews);
router.patch('/reviews/:id/status', adminController.updateReviewStatus);

// 4.16 CMS Pages
router.get('/cms', adminController.getCMSPages);
router.put('/cms/:slug', adminController.updateCMSPage);

// 4.17 Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// 4.18 Live Database Inspector
router.get('/db-inspector', adminController.getDatabaseInspector);

module.exports = router;
