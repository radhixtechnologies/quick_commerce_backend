const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Gemini AI Copilot Endpoints
router.post('/gemini/generate-description', aiController.generateProductDescription);
router.post('/gemini/generate-product-image', aiController.generateProductImage);
router.post('/gemini/generate-product-video', aiController.generateProductVideo);
router.get('/model-3d', aiController.getDynamicProduct3dModel);
router.post('/smart-search', aiController.aiSmartSearch);
router.post('/support/workflow-chat', aiController.partnerWorkflowChat);

module.exports = router;
