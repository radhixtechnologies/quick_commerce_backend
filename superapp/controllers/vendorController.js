const db = require('../config/db');

async function registerVendor(req, res) {
  try {
    const {
      business_name,
      owner_name,
      email,
      phone,
      vendor_category = 'food',
      description,
      address,
      city = 'Delhi NCR',
      pincode = '110001',
      service_radius_km = 10,
      bank_account_no,
      bank_ifsc
    } = req.body;

    if (!business_name || !owner_name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Business name, owner name, and phone number are required.'
      });
    }

    // Process file upload if provided
    let kyc_doc_url = null;
    let kyc_doc_type = 'Business Registration';
    if (req.file) {
      kyc_doc_url = `/uploads/${req.file.filename}`;
      kyc_doc_type = req.body.kyc_doc_type || 'Uploaded Document';
    }

    const newVendor = {
      id: db.memoryStore.vendors.length + 1,
      user_id: 100 + db.memoryStore.vendors.length + 1,
      business_name,
      owner_name,
      email: email || `${phone.replace(/\D/g, '')}@vendor.superapp`,
      phone,
      vendor_category: vendor_category.toLowerCase(),
      description: description || `Certified vendor providing ${vendor_category} on SuperApp`,
      address: address || `${city}, Pin: ${pincode}`,
      city,
      pincode,
      service_radius_km: parseFloat(service_radius_km) || 10,
      bank_account_no: bank_account_no || 'Pending Submission',
      bank_ifsc: bank_ifsc || 'SBIN00001',
      kyc_doc_type,
      kyc_doc_url: kyc_doc_url || '/uploads/sample-kyc.png',
      rating: 5.0,
      total_reviews: 0,
      is_open: 1,
      approval_status: 'approved', // auto-approve for live demo
      is_otp_verified: 1,
      created_at: new Date()
    };

    db.memoryStore.vendors.push(newVendor);

    res.status(201).json({
      success: true,
      message: `Vendor '${business_name}' registered successfully! Your store is now active on the SuperApp network.`,
      vendor: newVendor
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getVendors(req, res) {
  try {
    const { category } = req.query;
    let vendors = db.memoryStore.vendors;
    if (category) {
      vendors = vendors.filter(v => v.vendor_category.toLowerCase() === category.toLowerCase());
    }
    res.json({
      success: true,
      count: vendors.length,
      vendors
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  registerVendor,
  getVendors
};
