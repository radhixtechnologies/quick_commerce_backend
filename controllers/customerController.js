const db = require('../config/db');

// --- ADDRESSES ---
async function getAddresses(req, res) {
  try {
    const userId = req.user.id;
    let addresses = [];
    if (db.isConnected()) {
      addresses = await db.query('SELECT * FROM customer_addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC', [userId]);
    } else {
      addresses = [
        { id: 1, user_id: userId, type: 'Home', address_line1: 'H-12, Green Park', landmark: 'Near Fortis Hospital', city: 'Noida', state: 'UP', pincode: '201301', latitude: 28.625, longitude: 77.361, is_default: 1, delivery_instructions: 'Ring bell once' },
        { id: 2, user_id: userId, type: 'Work', address_line1: 'Office Tower 4, Sector 62', landmark: 'Metro Gate 2', city: 'Noida', state: 'UP', pincode: '201301', latitude: 28.6275, longitude: 77.363, is_default: 0, delivery_instructions: 'Call on reaching gate' }
      ];
    }
    res.json({ success: true, count: addresses.length, addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function addAddress(req, res) {
  try {
    const userId = req.user.id;
    const { type = 'Home', address_line1, address_line2, landmark, city = 'Noida', state = 'Uttar Pradesh', pincode, latitude, longitude, is_default = false, delivery_instructions } = req.body;

    if (!address_line1 || !pincode || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'address_line1, pincode, latitude, and longitude are required' });
    }

    if (db.isConnected()) {
      if (is_default) {
        await db.query('UPDATE customer_addresses SET is_default = 0 WHERE user_id = ?', [userId]);
      }
      const result = await db.query(
        'INSERT INTO customer_addresses (user_id, type, address_line1, address_line2, landmark, city, state, pincode, latitude, longitude, is_default, delivery_instructions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, type, address_line1, address_line2 || null, landmark || null, city, state, pincode, latitude, longitude, is_default ? 1 : 0, delivery_instructions || null]
      );
      return res.status(201).json({ success: true, message: 'Address saved successfully', addressId: result.insertId });
    }

    return res.status(201).json({ success: true, message: 'Address saved successfully', addressId: Date.now() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteAddress(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    if (db.isConnected()) {
      await db.query('DELETE FROM customer_addresses WHERE id = ? AND user_id = ?', [id, userId]);
    }
    res.json({ success: true, message: 'Address deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// --- CART ---
async function getCart(req, res) {
  try {
    const userId = req.user.id;
    let items = [];
    if (db.isConnected()) {
      items = await db.query(
        `SELECT c.*, p.name AS product_name, p.price AS original_price, p.discount_price, p.image_url, v.business_name AS vendor_name, v.latitude AS vendor_lat, v.longitude AS vendor_lng
         FROM cart_items c
         JOIN products p ON c.product_id = p.id
         JOIN vendors v ON c.vendor_id = v.id
         WHERE c.user_id = ?`,
        [userId]
      );
    } else {
      items = [
        { id: 1, user_id: userId, product_id: 1, vendor_id: 2, quantity: 2, product_name: 'Fresh Farm Milk 500ml', price: 32.0, image_url: '/images/products/milk.png', vendor_name: 'Fresh Mart' }
      ];
    }

    let subtotal = 0;
    items.forEach((item) => {
      const price = item.discount_price || item.price || item.original_price || 0;
      subtotal += price * (item.quantity || 1);
    });

    res.json({ success: true, items, subtotal: parseFloat(subtotal.toFixed(2)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function addToCart(req, res) {
  try {
    const userId = req.user.id;
    const { product_id, vendor_id, quantity = 1, selected_variation = null, selected_addons = null } = req.body;

    if (!product_id || !vendor_id) {
      return res.status(400).json({ success: false, message: 'product_id and vendor_id are required' });
    }

    if (db.isConnected()) {
      // Check multi-vendor cart restriction (quick commerce is per-vendor order)
      const existing = await db.query('SELECT DISTINCT vendor_id FROM cart_items WHERE user_id = ?', [userId]);
      if (existing.length > 0 && existing[0].vendor_id !== vendor_id) {
        // Can auto-clear or warn
        await db.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);
      }

      await db.query(
        'INSERT INTO cart_items (user_id, product_id, vendor_id, quantity, selected_variation, selected_addons) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, product_id, vendor_id, quantity, selected_variation ? JSON.stringify(selected_variation) : null, selected_addons ? JSON.stringify(selected_addons) : null]
      );
    }

    res.json({ success: true, message: 'Item added to cart' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function clearCart(req, res) {
  try {
    const userId = req.user.id;
    if (db.isConnected()) {
      await db.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);
    }
    res.json({ success: true, message: 'Cart cleared successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// --- SUPPORT TICKETS ---
async function createSupportTicket(req, res) {
  try {
    const userId = req.user.id;
    const { subject, message, category = 'Order Issue', order_id = null } = req.body;
    const ticketNo = 'TCK-' + Math.floor(100000 + Math.random() * 900000);

    if (db.isConnected()) {
      await db.query(
        'INSERT INTO support_tickets (ticket_no, user_id, order_id, subject, message, category) VALUES (?, ?, ?, ?, ?, ?)',
        [ticketNo, userId, order_id, subject, message, category]
      );
    }
    res.status(201).json({ success: true, message: 'Support ticket registered', ticketNo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getAddresses,
  addAddress,
  deleteAddress,
  getCart,
  addToCart,
  clearCart,
  createSupportTicket
};
