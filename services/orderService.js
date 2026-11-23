const db = require('../config/db');
const { ORDER_STATUSES, SOCKET_EVENTS } = require('../config/constants');
const dispatchService = require('./dispatchService');

class OrderService {
  constructor() {
    this.io = null;
  }

  setSocketIO(io) {
    this.io = io;
  }

  /**
   * Transition order to next state with audit timeline logging & socket alerts
   */
  async updateOrderStatus(orderId, newStatus, actor = {}) {
    const validStatuses = Object.values(ORDER_STATUSES);
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    let order = null;
    let vendor = null;

    if (db.isConnected()) {
      const orders = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
      if (orders.length === 0) throw new Error('Order not found');
      order = orders[0];

      const vendors = await db.query('SELECT * FROM vendors WHERE id = ?', [order.vendor_id]);
      vendor = vendors[0];
    } else {
      order = db.memoryStore.orders.find((o) => o.id == orderId);
      if (!order) throw new Error('Order not found');
      vendor = db.memoryStore.vendors.find((v) => v.id == order.vendor_id);
    }

    // Role-based state validation
    if (['accepted', 'preparing', 'ready_for_pickup'].includes(newStatus)) {
      if (actor.role === 'vendor' && vendor && vendor.user_id !== actor.userId) {
        throw new Error('Unauthorized: You are not the vendor for this order');
      }
    }

    if (['picked_up', 'out_for_delivery', 'delivered'].includes(newStatus)) {
      if (actor.role === 'delivery_boy' && order.delivery_boy_id !== actor.riderId) {
        throw new Error('Unauthorized: You are not the assigned delivery partner for this order');
      }
    }

    // Update timestamp fields
    const updates = { order_status: newStatus };
    let note = `Status changed to ${newStatus} by ${actor.name || actor.role || 'System'}`;

    if (newStatus === ORDER_STATUSES.ACCEPTED) updates.accepted_at = new Date();
    if (newStatus === ORDER_STATUSES.PREPARING) updates.preparing_at = new Date();
    if (newStatus === ORDER_STATUSES.READY_FOR_PICKUP) updates.ready_at = new Date();
    if (newStatus === ORDER_STATUSES.PICKED_UP) updates.picked_up_at = new Date();
    if (newStatus === ORDER_STATUSES.DELIVERED) {
      updates.delivered_at = new Date();
      updates.payment_status = 'paid';
    }
    if (newStatus === ORDER_STATUSES.CANCELLED) {
      updates.cancelled_at = new Date();
      updates.cancelled_by = actor.role || 'system';
      updates.cancellation_reason = actor.reason || 'Order cancelled';
      note += `. Reason: ${actor.reason || 'None'}`;
    }

    // Persist to DB or Memory
    if (db.isConnected()) {
      const setClauses = [];
      const values = [];
      for (const [key, val] of Object.entries(updates)) {
        setClauses.push(`${key} = ?`);
        values.push(val);
      }
      values.push(orderId);
      await db.query(`UPDATE orders SET ${setClauses.join(', ')} WHERE id = ?`, values);

      await db.query(
        'INSERT INTO order_status_logs (order_id, status, notes, created_by_user_id) VALUES (?, ?, ?, ?)',
        [orderId, newStatus, note, actor.userId || null]
      );

      // If delivered, update delivery boy wallet and statistics
      if (newStatus === ORDER_STATUSES.DELIVERED && order.delivery_boy_id) {
        await db.query(
          'UPDATE delivery_boys SET active_order_id = NULL, total_deliveries = total_deliveries + 1, wallet_balance = wallet_balance + ? WHERE id = ?',
          [order.delivery_boy_earnings, order.delivery_boy_id]
        );
        if (order.payment_method === 'COD') {
          await db.query(
            'UPDATE delivery_boys SET total_cod_collected = total_cod_collected + ? WHERE id = ?',
            [order.total_amount, order.delivery_boy_id]
          );
          await db.query(
            "INSERT INTO cod_collections (delivery_boy_id, order_id, amount_collected, deposit_status) VALUES (?, ?, ?, 'pending')",
            [order.delivery_boy_id, orderId, order.total_amount]
          );
        }
      }
    } else {
      Object.assign(order, updates);
    }

    // Trigger dispatch automatically when order is accepted or ready for pickup
    if (newStatus === ORDER_STATUSES.READY_FOR_PICKUP && (!order.delivery_boy_id || order.delivery_boy_id === 0)) {
      dispatchService.startDispatch(order, vendor);
    }

    // Socket Notifications
    if (this.io) {
      // 1. Order Room (Customer & Rider)
      this.io.to(`order_${orderId}`).emit(SOCKET_EVENTS.ORDER_STATUS_CHANGED, {
        orderId,
        orderCode: order.order_code,
        status: newStatus,
        note,
        timestamp: new Date().toISOString()
      });

      // 2. Vendor Room
      if (order.vendor_id) {
        this.io.to(`vendor_${order.vendor_id}`).emit(SOCKET_EVENTS.VENDOR_ORDER_STATUS_UPDATE, {
          orderId,
          orderCode: order.order_code,
          status: newStatus
        });
      }

      // 3. Admin Room
      this.io.to('admin_room').emit(SOCKET_EVENTS.ADMIN_NEW_ORDER_EVENT, {
        type: 'ORDER_STATUS_CHANGE',
        orderId,
        orderCode: order.order_code,
        status: newStatus
      });
    }

    return { success: true, orderId, newStatus, message: `Order status updated to ${newStatus}` };
  }
}

module.exports = new OrderService();
