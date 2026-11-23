const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalogController');

router.get('/categories', catalogController.getCategories);
router.get('/subcategories', catalogController.getSubcategories);
router.get('/products', catalogController.getProducts);
router.get('/banners', catalogController.getBanners);
router.get('/vendors', catalogController.getVendorsList);

module.exports = router;
