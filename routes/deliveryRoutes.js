const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/profile', deliveryController.getRiderProfile);
router.post('/toggle-online', deliveryController.toggleOnlineStatus);
router.post('/update-location', deliveryController.updateGPSLocation);
router.post('/dispatch-response', deliveryController.respondToDispatch);
router.post('/order/:orderId/deliver', deliveryController.verifyAndDeliver);

module.exports = router;
