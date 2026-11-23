const db = require('../config/db');

/**
 * Haversine formula to compute distance between two GPS coordinates in kilometers
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return parseFloat(distance.toFixed(2));
}

/**
 * Calculates delivery eligibility, charges, and time estimates
 */
async function evaluateDelivery({
  customerLat,
  customerLng,
  vendorId,
  subtotal = 0,
  pincode = null
}) {
  // 1. Fetch vendor details
  let vendor;
  if (db.isConnected()) {
    const vendors = await db.query('SELECT * FROM vendors WHERE id = ?', [vendorId]);
    vendor = vendors[0];
  } else {
    vendor = db.memoryStore.vendors.find((v) => v.id == vendorId);
  }

  if (!vendor) {
    return {
      isDeliverable: false,
      reason: 'Vendor not found or inactive'
    };
  }

  if (!vendor.is_open) {
    return {
      isDeliverable: false,
      reason: 'Vendor is currently closed'
    };
  }

  // 2. Fetch admin delivery settings
  let slabs = [];
  let freeThreshold = 299.0;
  let taxRate = 5.0;
  let platformFee = 5.0;

  if (db.isConnected()) {
    slabs = await db.query(
      'SELECT * FROM delivery_charge_slabs ORDER BY sort_order ASC, min_distance_km ASC'
    );
    const settings = await db.query(
      "SELECT setting_key, setting_value FROM admin_settings WHERE setting_key IN ('free_delivery_threshold', 'tax_percentage', 'platform_fee')"
    );
    settings.forEach((s) => {
      if (s.setting_key === 'free_delivery_threshold') freeThreshold = parseFloat(s.setting_value) || 299.0;
      if (s.setting_key === 'tax_percentage') taxRate = parseFloat(s.setting_value) || 5.0;
      if (s.setting_key === 'platform_fee') platformFee = parseFloat(s.setting_value) || 5.0;
    });
  } else {
    slabs = db.memoryStore.delivery_charge_slabs;
    freeThreshold = parseFloat(db.memoryStore.settings.free_delivery_threshold) || 299.0;
    taxRate = parseFloat(db.memoryStore.settings.tax_percentage) || 5.0;
    platformFee = parseFloat(db.memoryStore.settings.platform_fee) || 5.0;
  }

  // 3. Compute distance
  const distanceKm = calculateHaversineDistance(
    customerLat,
    customerLng,
    vendor.latitude,
    vendor.longitude
  );

  // 4. Check vendor specific maximum radius
  const maxVendorRadius = parseFloat(vendor.service_radius_km) || 10.0;
  if (distanceKm > maxVendorRadius) {
    return {
      isDeliverable: false,
      distanceKm,
      reason: `Distance (${distanceKm} KM) exceeds vendor delivery service radius (${maxVendorRadius} KM)`
    };
  }

  // 5. Match with Dynamic Slabs
  let matchedSlab = null;
  for (const slab of slabs) {
    const minD = parseFloat(slab.min_distance_km);
    const maxD = parseFloat(slab.max_distance_km);
    if (distanceKm >= minD && distanceKm <= maxD) {
      matchedSlab = slab;
      break;
    }
  }

  if (!matchedSlab || !matchedSlab.is_available) {
    return {
      isDeliverable: false,
      distanceKm,
      reason: `No delivery partner available for distance ${distanceKm} KM (Limit exceeded)`
    };
  }

  // 6. Free delivery check
  let deliveryCharge = parseFloat(matchedSlab.charge);
  let isFreeDelivery = false;
  if (subtotal >= freeThreshold) {
    deliveryCharge = 0.0;
    isFreeDelivery = true;
  }

  // 7. Check Minimum Order Amount
  const minOrderAmount = parseFloat(vendor.min_order_amount) || 99.0;
  const isMinOrderMet = subtotal >= minOrderAmount;

  // 8. Dynamic Estimated Delivery Time (10-30 mins for Quick Commerce)
  let estimatedTime = '12 - 15 mins';
  if (distanceKm <= 3.0) {
    estimatedTime = '10 - 15 mins';
  } else if (distanceKm <= 5.0) {
    estimatedTime = '15 - 20 mins';
  } else if (distanceKm <= 7.0) {
    estimatedTime = '20 - 25 mins';
  } else {
    estimatedTime = '25 - 30 mins';
  }

  const taxAmount = parseFloat(((subtotal * taxRate) / 100).toFixed(2));

  return {
    isDeliverable: true,
    distanceKm,
    deliveryCharge,
    originalDeliveryCharge: parseFloat(matchedSlab.charge),
    isFreeDelivery,
    freeDeliveryThreshold: freeThreshold,
    appliedSlab: matchedSlab.title || `${matchedSlab.min_distance_km}-${matchedSlab.max_distance_km} KM`,
    minOrderAmount,
    isMinOrderMet,
    taxRate,
    taxAmount,
    platformFee,
    estimatedTime
  };
}

module.exports = {
  calculateHaversineDistance,
  evaluateDelivery
};
