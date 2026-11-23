const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Gemini AI Copilot Endpoints
router.post('/gemini/generate-product-image', aiController.generateProductImage);
router.post('/gemini/generate-product-video', aiController.generateProductVideo);
router.post('/support/workflow-chat', aiController.partnerWorkflowChat);

module.exports = router;
