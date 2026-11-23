const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middlewares/authMiddleware');

// Public or Customer quote check
router.post('/quote', orderController.checkDeliveryQuote);

// Customer protected routes
router.post('/place', authenticate, orderController.placeOrder);
router.get('/my-orders', authenticate, orderController.getMyOrders);
router.get('/:orderId', authenticate, orderController.getOrderDetails);

module.exports = router;
