const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const vendorController = require('../controllers/vendorController');
const { authenticate } = require('../middlewares/authMiddleware');

// Public or Customer quote check
router.post('/quote', orderController.checkDeliveryQuote);

// Direct Customer App Order Creation & History Sync
router.post('/', vendorController.createOrder);
router.get('/customer', vendorController.getCustomerOrders);

// Customer protected routes
router.post('/place', authenticate, orderController.placeOrder);
router.get('/my-orders', authenticate, orderController.getMyOrders);
router.get('/:orderId', authenticate, orderController.getOrderDetails);

module.exports = router;
