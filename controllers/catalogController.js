const db = require('../config/db');

async function getCategories(req, res) {
  try {
    let module_type = req.query.module_type || req.query.category;
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
    const { category_id, vendor_id, module_type, category, search, is_featured, food_type } = req.query;
    const vertical = category || module_type;
    let products = [];

    if (db.isConnected()) {
      let sql = `
        SELECT p.*, v.business_name AS vendor_name, v.vendor_category AS vendor_category, v.rating AS vendor_rating, c.name AS category_name
        FROM products p
        JOIN vendors v ON p.vendor_id = v.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_available = 1
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
      if (vertical) {
        if (vertical === 'grocery' || vertical === 'daily_needs') {
          sql += " AND (v.vendor_category IN ('grocery', 'daily_needs') OR v.business_type IN ('grocery', 'daily_needs') OR c.module_type IN ('grocery', 'daily_needs'))";
        } else {
          sql += ' AND (v.vendor_category = ? OR v.business_type = ? OR c.module_type = ?)';
          params.push(vertical, vertical, vertical);
        }
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

    products = products.map((p) => ({
      ...p,
      image: p.image_url || p.image || '',
      is_veg: p.food_type ? p.food_type === 'veg' : true
    }));

    res.json({ success: true, count: products.length, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getBanners(req, res) {
  try {
    const { type, category, module_type } = req.query;
    const mod = module_type || category;
    let banners = [];
    if (db.isConnected()) {
      let sql = 'SELECT * FROM banners WHERE is_active = 1';
      const params = [];
      if (type) {
        sql += ' AND banner_type = ?';
        params.push(type);
      }
      if (mod && mod !== 'all') {
        sql += " AND (module_type = 'all' OR module_type = ? OR module_type IS NULL)";
        params.push(mod);
      }
      sql += ' ORDER BY id DESC, sort_order ASC';
      banners = await db.query(sql, params);
    } else {
      banners = (db.memoryStore.banners || []).filter((b) => {
        if (b.is_active === 0 || b.is_active === false) return false;
        if (type && b.banner_type !== type) return false;
        if (mod && mod !== 'all' && b.module_type && b.module_type !== 'all' && b.module_type !== mod) return false;
        return true;
      });
    }

    res.json({ success: true, count: banners.length, banners });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getVendorsList(req, res) {
  try {
    const { business_type, category } = req.query;
    const vertical = category || business_type;
    let vendors = [];
    if (db.isConnected()) {
      let sql = "SELECT * FROM vendors WHERE approval_status IN ('approved', 'pending')";
      const params = [];
      if (vertical) {
        if (vertical === 'grocery' || vertical === 'daily_needs') {
          sql += " AND (vendor_category IN ('grocery', 'daily_needs') OR business_type IN ('grocery', 'daily_needs'))";
        } else {
          sql += ' AND (vendor_category = ? OR business_type = ?)';
          params.push(vertical, vertical);
        }
      }
      sql += ' ORDER BY id DESC';
      vendors = await db.query(sql, params);

      // Attach each vendor's first product as Must Try & cover image fallback
      for (const v of vendors) {
        const prods = await db.query(
          'SELECT name, price, image_url FROM products WHERE vendor_id = ? AND is_available = 1 ORDER BY is_featured DESC, id DESC LIMIT 1',
          [v.id]
        );
        let docs = {};
        try { docs = typeof v.documents_json === 'string' ? JSON.parse(v.documents_json) : (v.documents_json || {}); } catch (_) {}
        v.logo = v.logo_url || docs.logo || docs.store_front || (prods[0]?.image_url || '');
        v.cover_image = v.cover_image_url || docs.store_front || (prods[0]?.image_url || v.logo || '');
        v.must_try_name = prods[0]?.name || 'Chef Special';
        v.must_try_price = prods[0]?.price || 99;
        v.eta = '20-30';
      }
    } else {
      vendors = db.memoryStore.vendors.filter((v) => !vertical || v.vendor_category === vertical || v.business_type === vertical);
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
