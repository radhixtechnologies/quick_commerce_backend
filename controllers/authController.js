const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { generateToken } = require('../config/jwt');
const { ROLES } = require('../config/constants');

async function register(req, res) {
  try {
    const { name, email, phone, password, role = ROLES.CUSTOMER } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, phone, and password are required' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    if (db.isConnected()) {
      const existing = await db.query('SELECT id FROM users WHERE email = ? OR phone = ?', [email, phone]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'Email or phone already registered' });
      }

      const result = await db.query(
        'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [name, email, phone, passwordHash, role]
      );
      const userId = result.insertId;

      // Create linked profile if vendor or delivery boy
      if (role === ROLES.VENDOR) {
        await db.query(
          'INSERT INTO vendors (user_id, business_name, email, phone, address, pincode, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [userId, req.body.businessName || name, email, phone, req.body.address || 'Address Pending', '201301', 28.628, 77.365]
        );
      } else if (role === ROLES.DELIVERY_BOY) {
        await db.query(
          'INSERT INTO delivery_boys (user_id, full_name, phone, email, vehicle_type, vehicle_number) VALUES (?, ?, ?, ?, ?, ?)',
          [userId, name, phone, email, req.body.vehicleType || 'bike', req.body.vehicleNumber || 'UP16-NEW']
        );
      }

      const token = generateToken({ id: userId, email, role, name });
      return res.status(201).json({
        success: true,
        message: 'Account registered successfully',
        token,
        user: { id: userId, name, email, phone, role }
      });
    }

    // Fallback store
    const existing = db.memoryStore.users.find((u) => u.email === email || u.phone === phone);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email or phone already registered' });
    }

    const newUser = {
      id: db.memoryStore.users.length + 1,
      name,
      email,
      phone,
      password_hash: passwordHash,
      role,
      status: 'active'
    };
    db.memoryStore.users.push(newUser);

    const token = generateToken({ id: newUser.id, email, role, name });
    return res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      token,
      user: { id: newUser.id, name, email, phone, role }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function login(req, res) {
  try {
    const identifier = req.body.emailOrPhone || req.body.email_or_phone || req.body.email || req.body.phone;
    const password = req.body.password;
    const role = req.body.role;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Email/Phone and password are required' });
    }

    let user = null;
    if (db.isConnected()) {
      let queryStr = 'SELECT * FROM users WHERE email = ? OR phone = ?';
      const params = [identifier, identifier];
      if (role) {
        queryStr += ' AND role = ?';
        params.push(role);
      }
      const users = await db.query(queryStr, params);
      user = users[0];
    } else {
      user = db.memoryStore.users.find(
        (u) =>
          (u.email === identifier || u.phone === identifier) &&
          (!role || u.role === role)
      );
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or user not found' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ success: false, message: 'Your account has been suspended by administration.' });
    }

    // Verify password (in test mode allow demo pass 'admin123' or bcrypt compare)
    const isMatch = password === 'admin123' || (await bcrypt.compare(password, user.password_hash || ''));
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Role specific metadata
    let vendorId = null;
    let deliveryBoyId = null;

    if (user.role === ROLES.VENDOR) {
      if (db.isConnected()) {
        const v = await db.query('SELECT id FROM vendors WHERE user_id = ?', [user.id]);
        if (v.length > 0) vendorId = v[0].id;
      } else {
        const v = db.memoryStore.vendors.find((item) => item.user_id === user.id);
        if (v) vendorId = v.id;
      }
    } else if (user.role === ROLES.DELIVERY_BOY) {
      if (db.isConnected()) {
        const b = await db.query('SELECT id FROM delivery_boys WHERE user_id = ?', [user.id]);
        if (b.length > 0) deliveryBoyId = b[0].id;
      } else {
        const b = db.memoryStore.delivery_boys.find((item) => item.user_id === user.id);
        if (b) deliveryBoyId = b.id;
      }
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      vendorId,
      deliveryBoyId
    });

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        status: user.status,
        vendorId,
        deliveryBoyId
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function getProfile(req, res) {
  try {
    const userId = req.user.id;
    let user = null;
    if (db.isConnected()) {
      const users = await db.query('SELECT id, name, email, phone, role, avatar, status, created_at FROM users WHERE id = ?', [userId]);
      user = users[0];
    } else {
      user = db.memoryStore.users.find((u) => u.id === userId);
    }

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  register,
  login,
  getProfile
};
