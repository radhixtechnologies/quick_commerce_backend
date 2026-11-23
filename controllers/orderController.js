const db = require('../config/db');
const { evaluateDelivery } = require('../services/deliveryRulesEngine');
const orderService = require('../services/orderService');
const { ORDER_STATUSES, SOCKET_EVENTS } = require('../config/constants');

async function checkDeliveryQuote(req, res) {
  try {
    const { customerLat, customerLng, vendorId, subtotal = 0, pincode } = req.body;

    if (!customerLat || !customerLng || !vendorId) {
      return res.status(400).json({ success: false, message: 'customerLat, customerLng, and vendorId are required' });
    }

    const evaluation = await evaluateDelivery({
      customerLat: parseFloat(customerLat),
      customerLng: parseFloat(customerLng),
      vendorId: parseInt(vendorId),
      subtotal: parseFloat(subtotal),
      pincode
    });

    res.json({ success: true, quote: evaluation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function placeOrder(req, res) {
  try {
    const customerId = req.user.id;
    const {
      vendorId,
      addressId,
      deliveryAddress,
      customerLat,
      customerLng,
      items = [],
      paymentMethod = 'COD',
      couponCode = null
    } = req.body;

    if (!vendorId || !items || items.length === 0 || !customerLat || !customerLng) {
      return res.status(400).json({ success: false, message: 'vendorId, items, customerLat, and customerLng are required' });
    }

    // 1. Calculate Items Subtotal
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const price = parseFloat(item.price);
      const qty = parseInt(item.quantity) || 1;
      const lineTotal = price * qty;
      subtotal += lineTotal;
      orderItems.push({
        productId: item.productId || item.id,
        name: item.name,
        price,
        quantity: qty,
        subtotal: lineTotal,
        variation: item.selectedVariation || null,
        addons: item.selectedAddons || null
      });
    }

    // 2. Evaluate Dynamic Delivery Rules
    const quote = await evaluateDelivery({
      customerLat: parseFloat(customerLat),
      customerLng: parseFloat(customerLng),
      vendorId: parseInt(vendorId),
      subtotal
    });

    if (!quote.isDeliverable) {
      return res.status(400).json({ success: false, message: quote.reason || 'Delivery not available to this location' });
    }

    if (!quote.isMinOrderMet) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of ₹${quote.minOrderAmount} not met. Current subtotal: ₹${subtotal}`
      });
    }

    // 3. Discount calculation if coupon provided
    let discountAmount = 0.0;
    if (couponCode) {
      if (couponCode.toUpperCase() === 'WELCOME50') {
        discountAmount = Math.min(subtotal * 0.5, 100);
      } else if (couponCode.toUpperCase() === 'QUICK30') {
        discountAmount = 30.0;
      }
    }

    const deliveryCharge = quote.deliveryCharge;
    const taxAmount = quote.taxAmount;
    const platformFee = quote.platformFee;
    const totalAmount = parseFloat((subtotal - discountAmount + deliveryCharge + taxAmount + platformFee).toFixed(2));

    // 4. Commission & Earnings
    const commissionRate = 15.0; // 15% default or vendor specific
    const platformCommission = parseFloat(((subtotal * commissionRate) / 100).toFixed(2));
    const vendorEarnings = parseFloat((subtotal - platformCommission).toFixed(2));
    const deliveryBoyEarnings = deliveryCharge > 0 ? deliveryCharge + 10.0 : 30.0; // Base rider incentive

    const orderCode = '#ORD' + Math.floor(1000 + Math.random() * 9000);
    const deliveryOtp = String(Math.floor(1000 + Math.random() * 9000));
    const estimatedTime = quote.estimatedTime;

    let newOrderId = Date.now();

    // 5. Persist Order
    if (db.isConnected()) {
      // Fetch vendor coordinates
      const vRows = await db.query('SELECT latitude, longitude FROM vendors WHERE id = ?', [vendorId]);
      const vendorLat = vRows[0]?.latitude || 28.628;
      const vendorLng = vRows[0]?.longitude || 77.365;

      const orderResult = await db.query(
        `INSERT INTO orders (
          order_code, customer_id, vendor_id, address_id, delivery_address_json,
          customer_lat, customer_lng, vendor_lat, vendor_lng, distance_km,
          subtotal, discount_amount, coupon_code, delivery_charge, tax_amount, platform_fee, total_amount,
          vendor_earnings, platform_commission, delivery_boy_earnings,
          payment_method, payment_status, order_status, delivery_otp, estimated_delivery_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'placed', ?, ?)`,
        [
          orderCode, customerId, vendorId, addressId || null, JSON.stringify(deliveryAddress || { address: 'User Address' }),
          customerLat, customerLng, vendorLat, vendorLng, quote.distanceKm,
          subtotal, discountAmount, couponCode, deliveryCharge, taxAmount, platformFee, totalAmount,
          vendorEarnings, platformCommission, deliveryBoyEarnings,
          paymentMethod, paymentMethod === 'COD' ? 'pending' : 'paid', deliveryOtp, estimatedTime
        ]
      );
      newOrderId = orderResult.insertId;

      // Insert items
      for (const it of orderItems) {
        await db.query(
          'INSERT INTO order_items (order_id, product_id, product_name, price, quantity, subtotal, selected_variation, selected_addons) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [newOrderId, it.productId, it.name, it.price, it.quantity, it.subtotal, JSON.stringify(it.variation), JSON.stringify(it.addons)]
        );
      }

      // Initial Timeline Log
      await db.query(
        "INSERT INTO order_status_logs (order_id, status, notes, created_by_user_id) VALUES (?, 'placed', 'Order placed successfully by customer', ?)",
        [newOrderId, customerId]
      );

      // Create Payment entry
      await db.query(
        'INSERT INTO payments (order_id, transaction_id, payment_method, amount, status) VALUES (?, ?, ?, ?, ?)',
        [newOrderId, 'TXN_' + Date.now(), paymentMethod, totalAmount, paymentMethod === 'COD' ? 'pending' : 'paid']
      );
    } else {
      const mockOrder = {
        id: newOrderId,
        order_code: orderCode,
        customer_id: customerId,
        customer_name: req.user.name || 'Customer',
        vendor_id: vendorId,
        vendor_name: 'Spice Hub',
        delivery_boy_id: null,
        rider_name: 'Unassigned',
        amount: totalAmount,
        subtotal,
        discount_amount: discountAmount,
        delivery_charge: deliveryCharge,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'COD' ? 'pending' : 'paid',
        order_status: 'placed',
        delivery_otp: deliveryOtp,
        distance_km: quote.distanceKm,
        created_at: new Date().toISOString(),
        items_count: orderItems.length
      };
      db.memoryStore.orders.unshift(mockOrder);
    }

    // 6. Real-time Sound/Alert Broadcast to Vendor via Socket.IO
    if (orderService.io) {
      orderService.io.to(`vendor_${vendorId}`).emit(SOCKET_EVENTS.VENDOR_NEW_ORDER_ALERT, {
        orderId: newOrderId,
        orderCode,
        totalAmount,
        itemsCount: orderItems.length,
        paymentMethod,
        estimatedTime,
        message: 'New incoming quick commerce order!'
      });

      orderService.io.to('admin_room').emit(SOCKET_EVENTS.ADMIN_NEW_ORDER_EVENT, {
        type: 'NEW_ORDER_PLACED',
        orderId: newOrderId,
        orderCode,
        totalAmount,
        vendorId
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      orderId: newOrderId,
      orderCode,
      totalAmount,
      deliveryOtp,
      estimatedDeliveryTime: estimatedTime
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function getOrderDetails(req, res) {
  try {
    const { orderId } = req.params;
    let order = null;
    let items = [];
    let timeline = [];

    if (db.isConnected()) {
      const orders = await db.query(
        `SELECT o.*, u.name AS customer_name, u.phone AS customer_phone, v.business_name AS vendor_name, v.address AS vendor_address, v.phone AS vendor_phone, d.full_name AS rider_name, d.phone AS rider_phone, d.vehicle_type, d.vehicle_number
         FROM orders o
         JOIN users u ON o.customer_id = u.id
         JOIN vendors v ON o.vendor_id = v.id
         LEFT JOIN delivery_boys d ON o.delivery_boy_id = d.id
         WHERE o.id = ?`,
        [orderId]
      );
      order = orders[0];
      if (order) {
        items = await db.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
        timeline = await db.query('SELECT * FROM order_status_logs WHERE order_id = ? ORDER BY id ASC', [orderId]);
      }
    } else {
      order = db.memoryStore.orders.find((o) => o.id == orderId);
      items = [
        { id: 1, product_name: 'Butter Paneer Masala Gravy', price: 249.0, quantity: 2, subtotal: 498.0 }
      ];
      timeline = [
        { id: 1, status: 'placed', notes: 'Order placed', created_at: new Date(Date.now() - 1000 * 60 * 15) },
        { id: 2, status: 'accepted', notes: 'Vendor confirmed', created_at: new Date(Date.now() - 1000 * 60 * 12) },
        { id: 3, status: order?.order_status || 'preparing', notes: 'Kitchen preparation', created_at: new Date() }
      ];
    }

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order, items, timeline });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getMyOrders(req, res) {
  try {
    const customerId = req.user.id;
    let orders = [];

    if (db.isConnected()) {
      orders = await db.query(
        `SELECT o.*, v.business_name AS vendor_name, v.logo_url AS vendor_logo
         FROM orders o
         JOIN vendors v ON o.vendor_id = v.id
         WHERE o.customer_id = ? ORDER BY o.id DESC`,
        [customerId]
      );
    } else {
      orders = db.memoryStore.orders.filter((o) => o.customer_id == customerId);
    }

    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  checkDeliveryQuote,
  placeOrder,
  getOrderDetails,
  getMyOrders
};
