const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

// Addresses
router.get('/addresses', customerController.getAddresses);
router.post('/addresses', customerController.addAddress);
router.delete('/addresses/:id', customerController.deleteAddress);

// Cart
router.get('/cart', customerController.getCart);
router.post('/cart/add', customerController.addToCart);
router.delete('/cart/clear', customerController.clearCart);

// Support tickets
router.post('/support-ticket', customerController.createSupportTicket);

module.exports = router;
