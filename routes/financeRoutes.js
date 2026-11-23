const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { ROLES } = require('../config/constants');

router.use(authenticate, authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN));

router.get('/cod-collections', financeController.getCODCollections);
router.post('/cod-collections/:id/verify', financeController.verifyCODDeposit);
router.get('/settlements', financeController.getSettlements);
router.get('/transactions', financeController.getTransactions);

module.exports = router;
