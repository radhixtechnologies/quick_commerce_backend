const db = require('../config/db');

async function getCODCollections(req, res) {
  try {
    let collections = [];
    if (db.isConnected()) {
      collections = await db.query(
        `SELECT c.*, d.full_name AS rider_name, d.phone AS rider_phone, o.order_code
         FROM cod_collections c
         JOIN delivery_boys d ON c.delivery_boy_id = d.id
         JOIN orders o ON c.order_id = o.id
         ORDER BY c.id DESC`
      );
    } else {
      collections = [
        { id: 1, rider_name: 'Rahul Khan', order_code: '#ORD1254', amount_collected: 249.0, deposit_status: 'deposited', created_at: new Date().toISOString() },
        { id: 2, rider_name: 'Amit Sharma', order_code: '#ORD1250', amount_collected: 450.0, deposit_status: 'verified', created_at: new Date(Date.now() - 86400000).toISOString() }
      ];
    }
    res.json({ success: true, count: collections.length, collections });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function verifyCODDeposit(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    if (db.isConnected()) {
      await db.query(
        "UPDATE cod_collections SET deposit_status = 'verified', verified_by_admin_id = ?, deposit_date = NOW() WHERE id = ?",
        [adminId, id]
      );
    }
    res.json({ success: true, message: 'COD deposit verified successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getSettlements(req, res) {
  try {
    const { type } = req.query; // 'vendor' or 'delivery_boy'
    let vendorSettlements = [];
    let riderSettlements = [];

    if (db.isConnected()) {
      vendorSettlements = await db.query(
        'SELECT s.*, v.business_name FROM vendor_settlements s JOIN vendors v ON s.vendor_id = v.id ORDER BY s.id DESC'
      );
      riderSettlements = await db.query(
        'SELECT s.*, d.full_name AS rider_name FROM delivery_boy_settlements s JOIN delivery_boys d ON s.delivery_boy_id = d.id ORDER BY s.id DESC'
      );
    } else {
      vendorSettlements = [
        { id: 1, business_name: 'Spice Hub', amount: 48200.0, settlement_date: '2026-11-18', status: 'processed', reference_id: 'PAY-VEND-991' },
        { id: 2, business_name: 'Fresh Mart', amount: 32100.0, settlement_date: '2026-11-18', status: 'processed', reference_id: 'PAY-VEND-992' }
      ];
      riderSettlements = [
        { id: 1, rider_name: 'Rahul Khan', amount: 3200.0, cod_deduction: 680.0, net_payout: 2520.0, settlement_date: '2026-11-18', status: 'processed', reference_id: 'PAY-RIDER-101' }
      ];
    }

    if (type === 'vendor') return res.json({ success: true, settlements: vendorSettlements });
    if (type === 'delivery_boy') return res.json({ success: true, settlements: riderSettlements });

    res.json({ success: true, vendorSettlements, riderSettlements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getTransactions(req, res) {
  try {
    let txns = [];
    if (db.isConnected()) {
      txns = await db.query(
        'SELECT p.*, o.order_code FROM payments p JOIN orders o ON p.order_id = o.id ORDER BY p.id DESC LIMIT 50'
      );
    } else {
      txns = [
        { id: 1, order_code: '#ORD1256', transaction_id: 'TXN1256', payment_method: 'UPI', amount: 498.0, status: 'paid', created_at: new Date().toISOString() },
        { id: 2, order_code: '#ORD1255', transaction_id: 'TXN1255', payment_method: 'CARD', amount: 697.0, status: 'paid', created_at: new Date().toISOString() },
        { id: 3, order_code: '#ORD1254', transaction_id: 'TXN1254', payment_method: 'COD', amount: 249.0, status: 'paid', created_at: new Date().toISOString() },
        { id: 4, order_code: '#ORD1253', transaction_id: 'TXN1253', payment_method: 'COD', amount: 399.0, status: 'failed', created_at: new Date().toISOString() }
      ];
    }
    res.json({ success: true, count: txns.length, transactions: txns });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getCODCollections,
  verifyCODDeposit,
  getSettlements,
  getTransactions
};
