const db = require('../config/db');

async function getCategories(req, res) {
  try {
    let { module_type } = req.query;
    if (module_type === 'service_based') module_type = 'services';
    let categories = [];

    if (db.isConnected()) {
      let sql = 'SELECT * FROM categories WHERE is_active = 1';
      const params = [];
      if (module_type && module_type !== 'all') {
        sql += ' AND module_type = ?';
        params.push(module_type);
      }
      sql += ' ORDER BY sort_order ASC, id ASC';
      categories = await db.query(sql, params);
    } else {
      categories = db.memoryStore.categories.filter((c) => !module_type || module_type === 'all' || c.module_type === module_type);
    }

    res.json({ success: true, count: categories.length, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getSubcategories(req, res) {
  try {
    const { category_id } = req.query;
    let subcategories = [];

    if (db.isConnected()) {
      let sql = 'SELECT * FROM subcategories WHERE is_active = 1';
      const params = [];
      if (category_id) {
        sql += ' AND category_id = ?';
        params.push(category_id);
      }
      sql += ' ORDER BY sort_order ASC, id ASC';
      subcategories = await db.query(sql, params);
    } else {
      subcategories = (db.memoryStore.subcategories || []).filter((s) => {
        if (s.is_active === 0) return false;
        if (category_id && s.category_id != category_id) return false;
        return true;
      });
    }

    res.json({ success: true, count: subcategories.length, subcategories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getProducts(req, res) {
  try {
    const { category_id, vendor_id, module_type, search, is_featured, food_type } = req.query;
    let products = [];

    if (db.isConnected()) {
      let sql = `
        SELECT p.*, v.business_name AS vendor_name, v.rating AS vendor_rating, c.name AS category_name
        FROM products p
        JOIN vendors v ON p.vendor_id = v.id
        JOIN categories c ON p.category_id = c.id
        WHERE p.is_available = 1 AND p.approval_status = 'approved'
      `;
      const params = [];

      if (category_id) {
        sql += ' AND p.category_id = ?';
        params.push(category_id);
      }
      if (vendor_id) {
        sql += ' AND p.vendor_id = ?';
        params.push(vendor_id);
      }
      if (module_type) {
        sql += ' AND c.module_type = ?';
        params.push(module_type);
      }
      if (food_type) {
        sql += ' AND p.food_type = ?';
        params.push(food_type);
      }
      if (is_featured === 'true' || is_featured === '1') {
        sql += ' AND p.is_featured = 1';
      }
      if (search) {
        sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      sql += ' ORDER BY p.is_featured DESC, p.id DESC';
      products = await db.query(sql, params);
    } else {
      products = db.memoryStore.products.filter((p) => {
        if (category_id && p.category_id != category_id) return false;
        if (vendor_id && p.vendor_id != vendor_id) return false;
        if (food_type && p.food_type !== food_type) return false;
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });
    }

    res.json({ success: true, count: products.length, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getBanners(req, res) {
  try {
    const { type } = req.query;
    let banners = [];
    if (db.isConnected()) {
      let sql = 'SELECT * FROM banners WHERE is_active = 1';
      const params = [];
      if (type) {
        sql += ' AND banner_type = ?';
        params.push(type);
      }
      sql += ' ORDER BY sort_order ASC';
      banners = await db.query(sql, params);
    } else {
      banners = db.memoryStore.banners.filter((b) => !type || b.banner_type === type);
    }

    res.json({ success: true, count: banners.length, banners });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getVendorsList(req, res) {
  try {
    const { business_type } = req.query;
    let vendors = [];
    if (db.isConnected()) {
      let sql = "SELECT * FROM vendors WHERE approval_status = 'approved'";
      const params = [];
      if (business_type) {
        sql += ' AND business_type = ?';
        params.push(business_type);
      }
      vendors = await db.query(sql, params);
    } else {
      vendors = db.memoryStore.vendors.filter((v) => !business_type || v.business_type === business_type);
    }

    res.json({ success: true, count: vendors.length, vendors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getCategories,
  getSubcategories,
  getProducts,
  getBanners,
  getVendorsList
};
