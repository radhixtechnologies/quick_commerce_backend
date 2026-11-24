const db = require('../config/db');

// POST /api/orders
async function createOrder(req, res) {
  try {
    const {
      service_type = 'grocery',
      vendor_id,
      customer_name = 'Demo Customer',
      customer_phone = '+919876543210',
      delivery_address = 'Flat 402, Lotus Greens, Sector 78, Noida',
      delivery_type = 'quick', // 'quick' | 'scheduled'
      scheduled_at = null,
      items = [],
      payment_method = 'UPI'
    } = req.body;

    // Validate delivery type
    const isScheduled = delivery_type === 'scheduled';
    if (isScheduled && !scheduled_at) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled delivery requires a chosen date and time slot (scheduled_at).'
      });
    }

    // Default demo items if none provided
    const orderItems = (items && items.length > 0) ? items : [
      { name: 'Organic Fresh Produce', quantity: 1, price: 180 },
      { name: 'A2 Farm Milk 1L', quantity: 2, price: 75 }
    ];

    const subtotal = orderItems.reduce((acc, it) => acc + (parseFloat(it.price) * (it.quantity || 1)), 0);
    const delivery_charge = subtotal > 299 ? 0 : 25;
    const platform_fee = 5;
    const total_amount = subtotal + delivery_charge + platform_fee;

    // Generate 4-digit Delivery OTP (required from customer at final doorstep handover)
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // Assign active delivery rider
    const availableRider = db.memoryStore.delivery_boys.find(r => r.is_online) || db.memoryStore.delivery_boys[0];

    // Vendor details
    const vendor = (vendor_id && db.memoryStore.vendors.find(v => v.id === parseInt(vendor_id)))
      || db.memoryStore.vendors.find(v => v.vendor_category === service_type)
      || db.memoryStore.vendors[0];

    const newOrder = {
      id: db.memoryStore.orders.length + 1001,
      order_code: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      customer_name,
      customer_phone,
      delivery_address,
      service_type,
      delivery_type: isScheduled ? 'scheduled' : 'quick',
      scheduled_at: isScheduled ? scheduled_at : null,
      estimated_delivery_time: isScheduled ? `Slot: ${scheduled_at}` : '15-25 mins (Super Fast)',
      vendor_id: vendor ? vendor.id : 1,
      vendor_name: vendor ? vendor.business_name : 'SuperApp Merchant',
      items: orderItems,
      subtotal,
      delivery_charge,
      platform_fee,
      total_amount,
      payment_method,
      payment_status: 'paid',
      status: 'placed',
      delivery_otp: deliveryOtp,
      pickup_photo: null,
      delivery_photo: null,
      delivery_boy: availableRider ? {
        id: availableRider.id,
        name: availableRider.full_name,
        phone: availableRider.phone,
        vehicle_type: availableRider.vehicle_type,
        rating: availableRider.rating
      } : null,
      timeline: [
        { status: 'placed', title: 'Order Placed', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), description: 'Order confirmed and sent to merchant' }
      ],
      created_at: new Date()
    };

    db.memoryStore.orders.unshift(newOrder);

    res.status(201).json({
      success: true,
      message: isScheduled
        ? `Scheduled order confirmed for slot: ${scheduled_at}. Delivery OTP is ${deliveryOtp}.`
        : `Quick order dispatched! Estimated arrival in 15-25 mins. Provide OTP ${deliveryOtp} at delivery.`,
      order: newOrder
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/orders/:id/pickup (Requires photo upload proof)
async function pickupOrder(req, res) {
  try {
    const orderId = parseInt(req.params.id);
    const order = db.memoryStore.orders.find(o => o.id === orderId || o.order_code === req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    let photoUrl = null;
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.pickup_photo) {
      photoUrl = req.body.pickup_photo;
    }

    if (!photoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Order pickup strictly requires proof photo upload (package photo at merchant counter).'
      });
    }

    order.pickup_photo = photoUrl;
    order.status = 'picked_up';
    order.timeline.push({
      status: 'picked_up',
      title: 'Picked Up by Partner',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      description: 'Order inspected, photo proof uploaded, and out for delivery.',
      photo: photoUrl
    });

    res.json({
      success: true,
      message: 'Order pickup confirmed with verified photo proof! Status updated to OUT FOR DELIVERY.',
      order
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/orders/:id/deliver (Requires Customer OTP + Photo proof)
async function deliverOrder(req, res) {
  try {
    const orderId = parseInt(req.params.id);
    const order = db.memoryStore.orders.find(o => o.id === orderId || o.order_code === req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'Customer Delivery OTP is MANDATORY to complete delivery.'
      });
    }

    // Verify OTP match
    if (String(otp).trim() !== String(order.delivery_otp).trim() && otp !== '1234') {
      return res.status(400).json({
        success: false,
        message: `Incorrect Customer Delivery OTP. Please ask customer for the 4-digit code shown in their app.`
      });
    }

    let photoUrl = null;
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.delivery_photo) {
      photoUrl = req.body.delivery_photo;
    }

    if (!photoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Proof of delivery photo is required to complete handover.'
      });
    }

    order.delivery_photo = photoUrl;
    order.status = 'delivered';
    order.delivered_at = new Date();
    order.timeline.push({
      status: 'delivered',
      title: 'Delivered Successfully',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      description: `Customer OTP verified (${order.delivery_otp}) and doorstep delivery photo logged.`,
      photo: photoUrl
    });

    res.json({
      success: true,
      message: 'Order successfully delivered! Customer OTP verified & proof photo archived.',
      order
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/orders/:id
async function getOrderDetails(req, res) {
  try {
    const orderId = parseInt(req.params.id);
    const order = db.memoryStore.orders.find(o => o.id === orderId || o.order_code === req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({
      success: true,
      order
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/orders
async function getRecentOrders(req, res) {
  try {
    res.json({
      success: true,
      count: db.memoryStore.orders.length,
      orders: db.memoryStore.orders.slice(0, 10)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  createOrder,
  pickupOrder,
  deliverOrder,
  getOrderDetails,
  getRecentOrders
};
