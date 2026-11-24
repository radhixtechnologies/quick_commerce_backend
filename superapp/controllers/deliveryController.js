const db = require('../config/db');

async function registerDeliveryPartner(req, res) {
  try {
    const {
      full_name,
      phone,
      email,
      vehicle_type = 'bike',
      vehicle_number,
      driving_license_no,
      aadhaar_no,
      city = 'Delhi NCR'
    } = req.body;

    if (!full_name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Full name and phone number are required.'
      });
    }

    let license_doc_url = null;
    if (req.file) {
      license_doc_url = `/uploads/${req.file.filename}`;
    }

    const newRider = {
      id: db.memoryStore.delivery_boys.length + 1,
      user_id: 200 + db.memoryStore.delivery_boys.length + 1,
      full_name,
      phone,
      email: email || `${phone.replace(/\D/g, '')}@rider.superapp`,
      vehicle_type: vehicle_type.toLowerCase(),
      vehicle_number: vehicle_number || 'DL-TEMP-9988',
      driving_license_no: driving_license_no || 'DL-2026-PENDING',
      aadhaar_no: aadhaar_no || 'XXXX-XXXX-1234',
      license_doc_url: license_doc_url || '/uploads/sample-license.png',
      city,
      is_online: 1,
      approval_status: 'approved',
      current_latitude: 28.6139,
      current_longitude: 77.2090,
      rating: 5.0,
      total_deliveries: 0,
      wallet_balance: 500.00, // Joining bonus
      created_at: new Date()
    };

    db.memoryStore.delivery_boys.push(newRider);

    res.status(201).json({
      success: true,
      message: `Welcome aboard, ${full_name}! Your Delivery Partner registration is verified. You have received ₹500 joining bonus in your wallet.`,
      rider: newRider
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getRiders(req, res) {
  try {
    res.json({
      success: true,
      riders: db.memoryStore.delivery_boys
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function toggleOnline(req, res) {
  try {
    const riderId = req.params.id ? parseInt(req.params.id) : 1;
    const rider = db.memoryStore.delivery_boys.find(r => r.id === riderId) || db.memoryStore.delivery_boys[0];
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }
    rider.is_online = rider.is_online ? 0 : 1;
    res.json({
      success: true,
      message: `Rider is now ${rider.is_online ? 'ONLINE (Ready for Dispatches)' : 'OFFLINE'}`,
      is_online: Boolean(rider.is_online),
      rider
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  registerDeliveryPartner,
  getRiders,
  toggleOnline
};
