const express = require('express');
const router = express.Router();
const deliveryRulesController = require('../controllers/deliveryRulesController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { ROLES } = require('../config/constants');

// Public read of slabs
router.get('/slabs', deliveryRulesController.getDeliverySlabs);

// Admin-only modification of rules & slabs
router.post('/slabs', authenticate, authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), deliveryRulesController.addDeliverySlab);
router.put('/slabs/:id', authenticate, authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), deliveryRulesController.updateDeliverySlab);
router.delete('/slabs/:id', authenticate, authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), deliveryRulesController.deleteDeliverySlab);

module.exports = router;
