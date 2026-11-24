const db = require('../config/db');
const { SERVICE_PILLARS } = require('../config/constants');

async function getServices(req, res) {
  try {
    res.json({
      success: true,
      count: SERVICE_PILLARS.length,
      services: SERVICE_PILLARS
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getCategories(req, res) {
  try {
    res.json({
      success: true,
      count: db.memoryStore.categories.length,
      categories: db.memoryStore.categories
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getServices,
  getCategories
};
