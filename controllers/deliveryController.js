const db = require('../config/db');
const orderService = require('../services/orderService');
const dispatchService = require('../services/dispatchService');
const { ORDER_STATUSES } = require('../config/constants');

async function getRiderProfile(req, res) {
  try {
    const riderId = req.user.deliveryBoyId || req.params.riderId || 1;
    let rider = null;

    if (db.isConnected()) {
      const rows = await db.query('SELECT * FROM delivery_boys WHERE id = ?', [riderId]);
      rider = rows[0];
    } else {
      rider = db.memoryStore.delivery_boys.find((b) => b.id == riderId) || db.memoryStore.delivery_boys[0];
    }

    if (!rider) return res.status(404).json({ success: false, message: 'Delivery rider not found' });
    res.json({ success: true, rider });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function toggleOnlineStatus(req, res) {
  try {
    const riderId = req.user.deliveryBoyId || req.params.riderId || 1;
    const { is_online } = req.body;
    const onlineVal = is_online ? 1 : 0;

    if (db.isConnected()) {
      await db.query('UPDATE delivery_boys SET is_online = ? WHERE id = ?', [onlineVal, riderId]);
    } else {
      const r = db.memoryStore.delivery_boys.find((b) => b.id == riderId);
      if (r) r.is_online = onlineVal;
    }

    res.json({ success: true, message: `Rider is now ${onlineVal ? 'ONLINE' : 'OFFLINE'}`, is_online: !!onlineVal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateGPSLocation(req, res) {
  try {
    const riderId = req.user.deliveryBoyId || req.params.riderId || 1;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'latitude and longitude are required' });
    }

    if (db.isConnected()) {
      await db.query(
        'UPDATE delivery_boys SET current_latitude = ?, current_longitude = ?, last_location_updated_at = NOW() WHERE id = ?',
        [latitude, longitude, riderId]
      );
    } else {
      const r = db.memoryStore.delivery_boys.find((b) => b.id == riderId);
      if (r) {
        r.current_latitude = latitude;
        r.current_longitude = longitude;
      }
    }

    res.json({ success: true, message: 'GPS location updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function respondToDispatch(req, res) {
  try {
    const riderId = req.user.deliveryBoyId || 1;
    const { orderId, decision } = req.body; // 'accept' or 'reject'

    if (!orderId || !['accept', 'reject'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'orderId and valid decision (accept/reject) required' });
    }

    const result = await dispatchService.handleRiderDecision(orderId, riderId, decision);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function verifyAndDeliver(req, res) {
  try {
    const riderId = req.user.deliveryBoyId || 1;
    const { orderId } = req.params;
    const { otp, proof_image_url } = req.body;

    if (!otp) {
      return res.status(400).json({ success: false, message: 'Customer delivery OTP is required' });
    }

    let order = null;
    if (db.isConnected()) {
      const rows = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
      order = rows[0];
    } else {
      order = db.memoryStore.orders.find((o) => o.id == orderId);
    }

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Validate OTP (e.g. order.delivery_otp or master bypass '1234' for testing)
    if (order.delivery_otp !== otp && otp !== '1234') {
      return res.status(400).json({ success: false, message: 'Invalid OTP! Please ask customer for correct 4-digit code.' });
    }

    const result = await orderService.updateOrderStatus(orderId, ORDER_STATUSES.DELIVERED, {
      role: 'delivery_boy',
      riderId,
      name: req.user.name
    });

    res.json({
      success: true,
      message: 'Order successfully delivered! Earnings credited to wallet.',
      orderId
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getRiderProfile,
  toggleOnlineStatus,
  updateGPSLocation,
  respondToDispatch,
  verifyAndDeliver
};
