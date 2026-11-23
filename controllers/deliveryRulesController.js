const db = require('../config/db');

async function getDeliverySlabs(req, res) {
  try {
    let slabs = [];
    if (db.isConnected()) {
      slabs = await db.query('SELECT * FROM delivery_charge_slabs ORDER BY sort_order ASC, min_distance_km ASC');
    } else {
      slabs = db.memoryStore.delivery_charge_slabs;
    }
    res.json({ success: true, count: slabs.length, slabs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function addDeliverySlab(req, res) {
  try {
    const { min_distance_km, max_distance_km, charge, is_available = true, title, sort_order = 0 } = req.body;

    if (min_distance_km === undefined || max_distance_km === undefined || charge === undefined) {
      return res.status(400).json({ success: false, message: 'min_distance_km, max_distance_km, and charge are required' });
    }

    if (db.isConnected()) {
      const result = await db.query(
        'INSERT INTO delivery_charge_slabs (min_distance_km, max_distance_km, charge, is_available, title, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [min_distance_km, max_distance_km, charge, is_available ? 1 : 0, title || `${min_distance_km}-${max_distance_km} KM`, sort_order]
      );
      return res.status(201).json({ success: true, message: 'Delivery slab created', slabId: result.insertId });
    }

    const newSlab = {
      id: db.memoryStore.delivery_charge_slabs.length + 1,
      min_distance_km: parseFloat(min_distance_km),
      max_distance_km: parseFloat(max_distance_km),
      charge: parseFloat(charge),
      is_available: is_available ? 1 : 0,
      title: title || `${min_distance_km}-${max_distance_km} KM`,
      sort_order
    };
    db.memoryStore.delivery_charge_slabs.push(newSlab);

    res.status(201).json({ success: true, message: 'Delivery slab created', slab: newSlab });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateDeliverySlab(req, res) {
  try {
    const { id } = req.params;
    const { min_distance_km, max_distance_km, charge, is_available, title, sort_order } = req.body;

    if (db.isConnected()) {
      await db.query(
        'UPDATE delivery_charge_slabs SET min_distance_km = ?, max_distance_km = ?, charge = ?, is_available = ?, title = ?, sort_order = ? WHERE id = ?',
        [min_distance_km, max_distance_km, charge, is_available ? 1 : 0, title, sort_order, id]
      );
    } else {
      const s = db.memoryStore.delivery_charge_slabs.find((item) => item.id == id);
      if (s) {
        if (min_distance_km !== undefined) s.min_distance_km = parseFloat(min_distance_km);
        if (max_distance_km !== undefined) s.max_distance_km = parseFloat(max_distance_km);
        if (charge !== undefined) s.charge = parseFloat(charge);
        if (is_available !== undefined) s.is_available = is_available ? 1 : 0;
        if (title !== undefined) s.title = title;
        if (sort_order !== undefined) s.sort_order = sort_order;
      }
    }

    res.json({ success: true, message: 'Delivery slab updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteDeliverySlab(req, res) {
  try {
    const { id } = req.params;
    if (db.isConnected()) {
      await db.query('DELETE FROM delivery_charge_slabs WHERE id = ?', [id]);
    } else {
      db.memoryStore.delivery_charge_slabs = db.memoryStore.delivery_charge_slabs.filter((s) => s.id != id);
    }
    res.json({ success: true, message: 'Delivery slab deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getDeliverySlabs,
  addDeliverySlab,
  updateDeliverySlab,
  deleteDeliverySlab
};
