const db = require('../config/db');
const reportService = require('../services/reportService');
const notificationService = require('../services/notificationService');
const orderService = require('../services/orderService');

// 4.1 DASHBOARD (12 KPI CARDS & ANALYTICS)
async function getDashboardKPIs(req, res) {
  try {
    let kpiData = {};

    if (db.isConnected()) {
      const userCounts = await db.query(
        "SELECT role, COUNT(*) AS count FROM users GROUP BY role"
      );
      const roleMap = {};
      userCounts.forEach((r) => { roleMap[r.role] = r.count; });

      const orderAgg = await db.query(`
        SELECT 
          COUNT(*) AS total_orders,
          SUM(CASE WHEN order_status IN ('placed', 'accepted', 'preparing', 'ready_for_pickup') THEN 1 ELSE 0 END) AS pending_orders,
          SUM(CASE WHEN order_status = 'delivered' THEN 1 ELSE 0 END) AS completed_orders,
          SUM(CASE WHEN order_status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders,
          SUM(CASE WHEN order_status = 'delivered' THEN total_amount ELSE 0 END) AS total_sales,
          SUM(CASE WHEN order_status = 'delivered' THEN platform_commission ELSE 0 END) AS commission,
          SUM(CASE WHEN order_status = 'delivered' THEN delivery_charge ELSE 0 END) AS delivery_charges,
          SUM(CASE WHEN order_status = 'delivered' THEN vendor_earnings ELSE 0 END) AS vendor_earnings,
          SUM(CASE WHEN order_status = 'delivered' THEN delivery_boy_earnings ELSE 0 END) AS delivery_boy_earnings
        FROM orders
      `);
      const o = orderAgg[0] || {};

      kpiData = {
        totalCustomers: roleMap['customer'] || 0,
        totalVendors: roleMap['vendor'] || 0,
        totalDeliveryBoys: roleMap['delivery_boy'] || 0,
        totalOrders: o.total_orders || 0,
        pendingOrders: o.pending_orders || 0,
        completedOrders: o.completed_orders || 0,
        cancelledOrders: o.cancelled_orders || 0,
        totalSales: o.total_sales || 0,
        commission: o.commission || 0,
        deliveryCharges: o.delivery_charges || 0,
        vendorEarnings: o.vendor_earnings || 0,
        deliveryBoyEarnings: o.delivery_boy_earnings || 0
      };
    } else {
      const customersCount = (db.memoryStore.users || []).filter(u => u.role === 'customer').length;
      const vendorsCount = (db.memoryStore.vendors || []).length;
      const ridersCount = (db.memoryStore.delivery_boys || []).length;
      const orders = db.memoryStore.orders || [];
      const totalOrders = orders.length;
      const pendingOrders = orders.filter(o => ['placed', 'accepted', 'preparing', 'ready_for_pickup'].includes(o.order_status)).length;
      const completedOrders = orders.filter(o => o.order_status === 'delivered').length;
      const cancelledOrders = orders.filter(o => o.order_status === 'cancelled').length;
      const totalSales = orders.filter(o => o.order_status === 'delivered').reduce((s, o) => s + (o.amount || 0), 0);
      const commission = orders.filter(o => o.order_status === 'delivered').reduce((s, o) => s + (o.platform_commission || (o.amount * 0.15) || 0), 0);
      const deliveryCharges = orders.filter(o => o.order_status === 'delivered').reduce((s, o) => s + (o.delivery_charge || 0), 0);
      const vendorEarnings = totalSales - commission;
      const deliveryBoyEarnings = deliveryCharges;

      kpiData = {
        totalCustomers: customersCount,
        totalVendors: vendorsCount,
        totalDeliveryBoys: ridersCount,
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        totalSales,
        commission,
        deliveryCharges,
        vendorEarnings,
        deliveryBoyEarnings
      };
    }

    // Dynamic Chart analytics & Tables
    const analytics = {
      orderStatistics: {
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        completed: [0, 0, 0, 0, 0, 0, 0],
        pending: [0, 0, 0, 0, 0, 0, 0],
        cancelled: [0, 0, 0, 0, 0, 0, 0]
      },
      salesOverview: {
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        revenue: [0, 0, 0, 0, 0, 0, 0]
      },
      platformGrowth: {
        customers: '0%',
        vendors: '0%',
        deliveryBoys: '0%',
        orders: '0%'
      },
      topVendors: (db.memoryStore.vendors || []).slice(0, 5).map(v => ({
        name: v.business_name,
        orders: `${v.total_orders || 0} orders`,
        sales: v.total_revenue || 0,
        type: (v.vendor_category || 'food').toUpperCase()
      })),
      topProducts: (db.memoryStore.products || []).slice(0, 5).map(p => ({
        name: p.name,
        price: p.price,
        orders: `${p.total_reviews || 0} orders`
      })),
      topCategories: (db.memoryStore.categories || []).slice(0, 4).map(c => ({
        name: c.name,
        productsCount: `${c.products_count || 0} products`,
        icon: c.icon_url || '📁'
      })),
      recentOrders: db.isConnected()
        ? await db.query(`
            SELECT o.id, o.order_code, u.name AS customer, v.business_name AS vendor, o.total_amount AS amount, o.order_status AS status
            FROM orders o
            JOIN users u ON o.customer_id = u.id
            JOIN vendors v ON o.vendor_id = v.id
            ORDER BY o.id DESC LIMIT 5
          `)
        : (db.memoryStore.orders || []).slice(0, 5).map((o) => ({
            id: o.id,
            order_code: o.order_code,
            customer: o.customer_name,
            vendor: o.vendor_name,
            amount: o.amount,
            status: o.order_status
          }))
    };

    res.json({ success: true, kpis: kpiData, analytics });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 4.2 CUSTOMER MANAGEMENT
async function getAllCustomers(req, res) {
  try {
    let customers = [];
    if (db.isConnected()) {
      customers = await db.query(
        "SELECT id, name, email, phone, avatar, status, created_at FROM users WHERE role = 'customer' ORDER BY id DESC"
      );
    } else {
      customers = db.memoryStore.users.filter((u) => u.role === 'customer');
    }
    res.json({ success: true, count: customers.length, customers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function toggleCustomerStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active' or 'blocked'
    if (db.isConnected()) {
      await db.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    } else {
      const u = db.memoryStore.users.find((item) => item.id == id);
      if (u) u.status = status;
    }
    res.json({ success: true, message: `Customer status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 4.3 VENDOR MANAGEMENT (Category Filter & Role-wise KYC)
async function getAllVendors(req, res) {
  try {
    const { category, approval_status } = req.query;
    let vendors = [];
    if (db.isConnected()) {
      let sql = 'SELECT * FROM vendors WHERE 1=1';
      const params = [];
      if (category && category !== 'all') {
        sql += ' AND (vendor_category = ? OR business_type = ?)';
        params.push(category, category);
      }
      if (approval_status && approval_status !== 'all') {
        sql += ' AND approval_status = ?';
        params.push(approval_status);
      }
      sql += ' ORDER BY id DESC';
      vendors = await db.query(sql, params);
    } else {
      vendors = db.memoryStore.vendors.filter((v) => {
        if (category && category !== 'all' && (v.vendor_category !== category && v.business_type !== category)) return false;
        if (approval_status && approval_status !== 'all' && v.approval_status !== approval_status) return false;
        return true;
      });
    }
    res.json({ success: true, count: vendors.length, vendors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateVendorApproval(req, res) {
  try {
    const { id } = req.params;
    const approval_status = req.body.approval_status || req.body.status;
    const { rejection_reason, commission_rate } = req.body;

    if (!approval_status) {
      return res.status(400).json({ success: false, message: 'Status or approval_status is required' });
    }

    if (db.isConnected()) {
      await db.query(
        'UPDATE vendors SET approval_status = ?, rejection_reason = ?, commission_rate = COALESCE(?, commission_rate) WHERE id = ?',
        [approval_status, rejection_reason || null, commission_rate || null, id]
      );
    } else {
      const v = db.memoryStore.vendors.find((item) => item.id == id);
      if (v) {
        v.approval_status = approval_status;
        if (rejection_reason) v.rejection_reason = rejection_reason;
        if (commission_rate) v.commission_rate = parseFloat(commission_rate);
      }
    }

    // Real-time Socket.IO notification to the vendor app
    const io = req.app.get('io');
    if (io) {
      io.to(`vendor_${id}`).emit('vendor_status_updated', {
        vendorId: parseInt(id),
        approval_status,
        rejection_reason: rejection_reason || null
      });
      io.emit('vendor_status_updated', {
        vendorId: parseInt(id),
        approval_status,
        rejection_reason: rejection_reason || null
      });
    }

    res.json({ success: true, message: `Vendor approval status set to ${approval_status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateVendorDocumentStatus(req, res) {
  try {
    const { id } = req.params;
    const { document_key, status, rejection_reason } = req.body;

    if (!document_key || !status) {
      return res.status(400).json({ success: false, message: 'document_key and status are required' });
    }

    if (db.isConnected()) {
      const rows = await db.query('SELECT document_verification_json FROM vendors WHERE id = ?', [id]);
      if (rows.length > 0) {
        const verif = rows[0].document_verification_json || {};
        verif[document_key] = status;
        await db.query('UPDATE vendors SET document_verification_json = ? WHERE id = ?', [JSON.stringify(verif), id]);
      }
    } else {
      const v = db.memoryStore.vendors.find((item) => item.id == id);
      if (v) {
        if (!v.document_verification_json) v.document_verification_json = {};
        v.document_verification_json[document_key] = status;
      }
    }

    res.json({
      success: true,
      message: `Document "${document_key}" marked as ${status}`,
      document_key,
      status
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 4.4 DELIVERY BOY MANAGEMENT
async function getAllDeliveryBoys(req, res) {
  try {
    let deliveryBoys = [];
    if (db.isConnected()) {
      deliveryBoys = await db.query('SELECT * FROM delivery_boys ORDER BY id DESC');
    } else {
      deliveryBoys = db.memoryStore.delivery_boys;
    }
    res.json({ success: true, count: deliveryBoys.length, deliveryBoys });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateDeliveryBoyApproval(req, res) {
  try {
    const { id } = req.params;
    const { approval_status, rejection_reason } = req.body;

    if (db.isConnected()) {
      await db.query(
        'UPDATE delivery_boys SET approval_status = ?, rejection_reason = ? WHERE id = ?',
        [approval_status, rejection_reason || null, id]
      );
    } else {
      const b = db.memoryStore.delivery_boys.find((item) => item.id == id);
      if (b) {
        b.approval_status = approval_status;
        if (rejection_reason) b.rejection_reason = rejection_reason;
      }
    }
    res.json({ success: true, message: `Delivery boy approval status set to ${approval_status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 4.5 CATEGORY & SUBCATEGORY MANAGEMENT
async function getAllCategories(req, res) {
  try {
    const { module_type } = req.query;
    let categories = [];

    if (db.isConnected()) {
      let sql = `
        SELECT c.*, COUNT(DISTINCT p.id) AS products_count, COUNT(DISTINCT s.id) AS subcategories_count 
        FROM categories c 
        LEFT JOIN products p ON c.id = p.category_id 
        LEFT JOIN subcategories s ON c.id = s.category_id 
        WHERE 1=1
      `;
      const params = [];
      if (module_type && module_type !== 'all') {
        sql += ' AND c.module_type = ?';
        params.push(module_type);
      }
      sql += ' GROUP BY c.id ORDER BY c.sort_order ASC, c.id ASC';
      categories = await db.query(sql, params);

      // Fetch all active subcategories
      const allSubcats = await db.query('SELECT * FROM subcategories ORDER BY sort_order ASC, id ASC');
      categories = categories.map((c) => ({
        ...c,
        subcategories: allSubcats.filter((s) => s.category_id === c.id)
      }));
    } else {
      categories = db.memoryStore.categories
        .filter((c) => !module_type || module_type === 'all' || c.module_type === module_type)
        .map((c) => {
          const subs = (db.memoryStore.subcategories || []).filter((s) => s.category_id === c.id);
          return {
            ...c,
            products_count: db.memoryStore.products.filter((p) => p.category_id === c.id).length,
            subcategories_count: subs.length,
            subcategories: subs
          };
        });
    }

    res.json({ success: true, count: categories.length, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createCategory(req, res) {
  try {
    const { name, module_type = 'grocery', description, icon_url, image_url, sort_order = 0 } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Category name is required' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    if (db.isConnected()) {
      const result = await db.query(
        'INSERT INTO categories (name, slug, module_type, description, icon_url, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, slug, module_type, description || null, icon_url || null, image_url || null, sort_order]
      );
      return res.status(201).json({ success: true, message: 'Category created successfully', categoryId: result.insertId });
    }

    const newCat = {
      id: db.memoryStore.categories.length + 1,
      name,
      slug,
      module_type,
      description: description || '',
      icon_url: icon_url || '📁',
      is_active: 1,
      sort_order: parseInt(sort_order) || 0
    };
    db.memoryStore.categories.push(newCat);
    res.status(201).json({ success: true, message: 'Category created successfully', category: newCat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function toggleCategoryStatus(req, res) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const activeInt = is_active ? 1 : 0;

    if (db.isConnected()) {
      await db.query('UPDATE categories SET is_active = ? WHERE id = ?', [activeInt, id]);
    } else {
      const c = db.memoryStore.categories.find((item) => item.id == id);
      if (c) c.is_active = activeInt;
    }
    res.json({ success: true, message: 'Category status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    if (db.isConnected()) {
      await db.query('DELETE FROM categories WHERE id = ?', [id]);
    } else {
      db.memoryStore.categories = db.memoryStore.categories.filter((c) => c.id != id);
      db.memoryStore.subcategories = (db.memoryStore.subcategories || []).filter((s) => s.category_id != id);
    }
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// SUBCATEGORY MANAGEMENT
async function getAllSubcategories(req, res) {
  try {
    const { category_id, module_type } = req.query;
    let subcategories = [];

    if (db.isConnected()) {
      let sql = `
        SELECT s.*, c.name AS category_name, c.module_type 
        FROM subcategories s 
        JOIN categories c ON s.category_id = c.id 
        WHERE 1=1
      `;
      const params = [];
      if (category_id) {
        sql += ' AND s.category_id = ?';
        params.push(category_id);
      }
      if (module_type && module_type !== 'all') {
        sql += ' AND c.module_type = ?';
        params.push(module_type);
      }
      sql += ' ORDER BY s.category_id ASC, s.sort_order ASC, s.id ASC';
      subcategories = await db.query(sql, params);
    } else {
      subcategories = (db.memoryStore.subcategories || []).map((s) => {
        const cat = db.memoryStore.categories.find((c) => c.id === s.category_id) || {};
        return {
          ...s,
          category_name: cat.name || 'Uncategorized',
          module_type: cat.module_type || 'grocery'
        };
      }).filter((s) => {
        if (category_id && s.category_id != category_id) return false;
        if (module_type && module_type !== 'all' && s.module_type !== module_type) return false;
        return true;
      });
    }

    res.json({ success: true, count: subcategories.length, subcategories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createSubcategory(req, res) {
  try {
    const { category_id, name, icon_url, sort_order = 0 } = req.body;
    if (!category_id || !name) {
      return res.status(400).json({ success: false, message: 'category_id and subcategory name are required' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    if (db.isConnected()) {
      const result = await db.query(
        'INSERT INTO subcategories (category_id, name, slug, icon_url, sort_order) VALUES (?, ?, ?, ?, ?)',
        [category_id, name, slug, icon_url || null, sort_order]
      );
      return res.status(201).json({ success: true, message: 'Subcategory created successfully', subcategoryId: result.insertId });
    }

    const newSub = {
      id: (db.memoryStore.subcategories || []).length + 1,
      category_id: parseInt(category_id),
      name,
      slug,
      icon_url: icon_url || null,
      is_active: 1,
      sort_order: parseInt(sort_order) || 0
    };
    if (!db.memoryStore.subcategories) db.memoryStore.subcategories = [];
    db.memoryStore.subcategories.push(newSub);
    res.status(201).json({ success: true, message: 'Subcategory created successfully', subcategory: newSub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function toggleSubcategoryStatus(req, res) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const activeInt = is_active ? 1 : 0;

    if (db.isConnected()) {
      await db.query('UPDATE subcategories SET is_active = ? WHERE id = ?', [activeInt, id]);
    } else {
      const s = (db.memoryStore.subcategories || []).find((item) => item.id == id);
      if (s) s.is_active = activeInt;
    }
    res.json({ success: true, message: 'Subcategory status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteSubcategory(req, res) {
  try {
    const { id } = req.params;
    if (db.isConnected()) {
      await db.query('DELETE FROM subcategories WHERE id = ?', [id]);
    } else {
      db.memoryStore.subcategories = (db.memoryStore.subcategories || []).filter((s) => s.id != id);
    }
    res.json({ success: true, message: 'Subcategory deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 4.6 PRODUCT MANAGEMENT
async function getAllProducts(req, res) {
  try {
    let products = [];
    if (db.isConnected()) {
      products = await db.query(`
        SELECT p.*, v.business_name AS vendor_name, c.name AS category_name
        FROM products p
        LEFT JOIN vendors v ON p.vendor_id = v.id
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.id DESC
      `);
    } else {
      products = db.memoryStore.products.map((p) => {
        const v = db.memoryStore.vendors.find((item) => item.id === p.vendor_id);
        const c = db.memoryStore.categories.find((item) => item.id === p.category_id);
        return {
          ...p,
          vendor_name: v ? v.business_name : 'Fresh Mart',
          category_name: c ? c.name : 'General'
        };
      });
    }
    res.json({ success: true, count: products.length, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function toggleProductStatus(req, res) {
  try {
    const { id } = req.params;
    const { is_available, approval_status } = req.body;

    if (db.isConnected()) {
      await db.query(
        'UPDATE products SET is_available = COALESCE(?, is_available), approval_status = COALESCE(?, approval_status) WHERE id = ?',
        [is_available !== undefined ? (is_available ? 1 : 0) : null, approval_status || null, id]
      );
    } else {
      const p = db.memoryStore.products.find((item) => item.id == id);
      if (p) {
        if (is_available !== undefined) p.is_available = is_available ? 1 : 0;
        if (approval_status) p.approval_status = approval_status;
      }
    }
    res.json({ success: true, message: 'Product updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createProduct(req, res) {
  try {
    const {
      vendor_id = 1,
      category_id,
      name,
      description,
      price,
      discount_price,
      stock = 100,
      unit = 'piece',
      food_type = 'veg',
      is_featured = false,
      variations,
      addons
    } = req.body;

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    if (db.isConnected()) {
      const result = await db.query(
        `INSERT INTO products (
          vendor_id, category_id, name, slug, description, price, discount_price, stock, unit, food_type, is_featured, variations, addons, approval_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
        [
          vendor_id, category_id, name, slug, description || null, price, discount_price || null, stock, unit, food_type,
          is_featured ? 1 : 0, variations ? JSON.stringify(variations) : null, addons ? JSON.stringify(addons) : null
        ]
      );
      return res.status(201).json({ success: true, message: 'Product added successfully', productId: result.insertId });
    }

    const newProd = {
      id: db.memoryStore.products.length + 1,
      vendor_id,
      category_id,
      name,
      price: parseFloat(price),
      discount_price: discount_price ? parseFloat(discount_price) : null,
      stock,
      unit,
      food_type,
      is_available: 1,
      is_featured: is_featured ? 1 : 0,
      approval_status: 'approved'
    };
    db.memoryStore.products.push(newProd);

    res.status(201).json({ success: true, message: 'Product added successfully', product: newProd });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 4.7 ORDER MANAGEMENT (Filterable tabs & manual status change)
async function getAllOrders(req, res) {
  try {
    const { status, vendor_id } = req.query;
    let orders = [];

    if (db.isConnected()) {
      let sql = `
        SELECT o.*, u.name AS customer_name, u.phone AS customer_phone, v.business_name AS vendor_name, d.full_name AS rider_name
        FROM orders o
        JOIN users u ON o.customer_id = u.id
        JOIN vendors v ON o.vendor_id = v.id
        LEFT JOIN delivery_boys d ON o.delivery_boy_id = d.id
        WHERE 1=1
      `;
      const params = [];
      if (status && status !== 'all') {
        sql += ' AND o.order_status = ?';
        params.push(status);
      }
      if (vendor_id) {
        sql += ' AND o.vendor_id = ?';
        params.push(vendor_id);
      }
      sql += ' ORDER BY o.id DESC';
      orders = await db.query(sql, params);
    } else {
      orders = db.memoryStore.orders.filter((o) => {
        if (status && status !== 'all' && o.order_status !== status) return false;
        if (vendor_id && o.vendor_id != vendor_id) return false;
        return true;
      });
    }

    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function adminChangeOrderStatus(req, res) {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;

    const result = await orderService.updateOrderStatus(orderId, status, {
      role: 'admin',
      userId: req.user.id,
      name: req.user.name,
      reason: note
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// 4.11 COUPONS & OFFERS
async function getAllCoupons(req, res) {
  try {
    let coupons = [];
    if (db.isConnected()) {
      coupons = await db.query('SELECT * FROM coupons ORDER BY id DESC');
    } else {
      coupons = db.memoryStore.coupons;
    }
    res.json({ success: true, count: coupons.length, coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createCoupon(req, res) {
  try {
    const { code, title, discount_type = 'percentage', discount_value, min_order_amount = 199, max_discount_amount = 100, valid_until = '2027-12-31' } = req.body;

    if (db.isConnected()) {
      await db.query(
        'INSERT INTO coupons (code, title, discount_type, discount_value, min_order_amount, max_discount_amount, valid_from, valid_until) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)',
        [code, title, discount_type, discount_value, min_order_amount, max_discount_amount, valid_until]
      );
    } else {
      db.memoryStore.coupons.push({
        id: db.memoryStore.coupons.length + 1,
        code,
        title,
        discount_type,
        discount_value: parseFloat(discount_value),
        min_order_amount: parseFloat(min_order_amount),
        max_discount_amount: parseFloat(max_discount_amount),
        is_active: 1,
        valid_until
      });
    }
    res.status(201).json({ success: true, message: 'Coupon created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 4.13 NOTIFICATIONS BROADCAST
async function sendBroadcastNotification(req, res) {
  try {
    const { recipientRole = 'all', category = 'General', title, body } = req.body;
    if (!title || !body) return res.status(400).json({ success: false, message: 'Title and body are required' });

    await notificationService.sendNotification({
      recipientRole,
      category,
      title,
      body
    });

    res.json({ success: true, message: `Notification broadcasted to ${recipientRole}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 4.14 REPORTS ENGINE
async function getReport(req, res) {
  try {
    const { type = 'sales' } = req.params;
    const { format = 'json' } = req.query;

    const report = await reportService.generateReport(type);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_report.csv"`);
      return res.send(report.csv);
    }

    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 4.16 CMS PAGES
async function getCMSPages(req, res) {
  try {
    let pages = [];
    if (db.isConnected()) {
      pages = await db.query('SELECT slug, title, content, updated_at FROM cms_pages');
    } else {
      pages = [
        { slug: 'about-us', title: 'About Us', content: 'About Quick Commerce' },
        { slug: 'privacy-policy', title: 'Privacy Policy', content: 'Privacy Policy terms' },
        { slug: 'terms-conditions', title: 'Terms & Conditions', content: 'Terms' },
        { slug: 'refund-policy', title: 'Refund Policy', content: 'Instant refunds policy' }
      ];
    }
    res.json({ success: true, pages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateCMSPage(req, res) {
  try {
    const { slug } = req.params;
    const { title, content } = req.body;
    if (db.isConnected()) {
      await db.query('UPDATE cms_pages SET title = ?, content = ? WHERE slug = ?', [title, content, slug]);
    }
    res.json({ success: true, message: `CMS page '${slug}' updated successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 4.12 BANNERS
async function getAllBanners(req, res) {
  try {
    let banners = [];
    if (db.isConnected()) {
      banners = await db.query('SELECT * FROM banners ORDER BY sort_order ASC, id DESC');
    } else {
      banners = db.memoryStore.banners;
    }
    res.json({ success: true, count: banners.length, banners });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 4.15 REVIEWS & RATINGS
async function getAllReviews(req, res) {
  try {
    let reviews = [];
    if (db.isConnected()) {
      reviews = await db.query(`
        SELECT r.*, u.name AS user_name, v.business_name AS vendor_name, p.name AS product_name
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN vendors v ON r.vendor_id = v.id
        LEFT JOIN products p ON r.product_id = p.id
        ORDER BY r.id DESC
      `);
    } else {
      reviews = [
        { id: 1, user_name: 'Neha Verma', vendor_name: 'Spice Hub', product_name: 'Butter Paneer Masala Gravy', rating: 5, comment: 'Butter paneer was warm and piping fresh! Reached in 13 mins.', status: 'approved' },
        { id: 2, user_name: 'Pooja Singh', vendor_name: 'Fresh Mart', product_name: 'Fresh Farm Milk 500ml', rating: 5, comment: 'Chilled fresh milk in early morning. Superb delivery service.', status: 'approved' },
        { id: 3, user_name: 'Neha Verma', vendor_name: 'Sweet Delights Bakery', product_name: 'Belgian Dark Chocolate Truffle Cake', rating: 5, comment: 'The chocolate truffle cake was absolute heaven!', status: 'approved' }
      ];
    }
    res.json({ success: true, count: reviews.length, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateReviewStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (db.isConnected()) {
      await db.query('UPDATE reviews SET status = ? WHERE id = ?', [status, id]);
    }
    res.json({ success: true, message: `Review status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 4.17 ADMIN SETTINGS
async function getSettings(req, res) {
  try {
    let settings = {};
    if (db.isConnected()) {
      const rows = await db.query('SELECT setting_key, setting_value, setting_group FROM admin_settings');
      rows.forEach((r) => { settings[r.setting_key] = r.setting_value; });
    } else {
      settings = db.memoryStore.settings;
    }
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateSettings(req, res) {
  try {
    const updates = req.body;
    if (db.isConnected()) {
      for (const [key, value] of Object.entries(updates)) {
        await db.query(
          'INSERT INTO admin_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
          [key, String(value), String(value)]
        );
      }
    } else {
      Object.assign(db.memoryStore.settings, updates);
    }
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getDashboardKPIs,
  getAllCustomers,
  toggleCustomerStatus,
  getAllVendors,
  updateVendorApproval,
  updateVendorDocumentStatus,
  getAllDeliveryBoys,
  updateDeliveryBoyApproval,
  getAllCategories,
  createCategory,
  toggleCategoryStatus,
  deleteCategory,
  getAllSubcategories,
  createSubcategory,
  toggleSubcategoryStatus,
  deleteSubcategory,
  getAllProducts,
  toggleProductStatus,
  createProduct,
  getAllOrders,
  adminChangeOrderStatus,
  getAllCoupons,
  createCoupon,
  getAllBanners,
  sendBroadcastNotification,
  getReport,
  getAllReviews,
  updateReviewStatus,
  getCMSPages,
  updateCMSPage,
  getSettings,
  updateSettings
};
