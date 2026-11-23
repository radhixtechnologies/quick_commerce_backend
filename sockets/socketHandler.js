const { SOCKET_EVENTS } = require('../config/constants');
const dispatchService = require('../services/dispatchService');
const orderService = require('../services/orderService');
const db = require('../config/db');

function registerSocketHandlers(io) {
  // Wire up socket instance in services
  dispatchService.setSocketIO(io);
  orderService.setSocketIO(io);

  io.on('connection', (socket) => {
    console.log(`⚡ Socket client connected: ${socket.id}`);

    // Join room (e.g. order_1, vendor_2, rider_3, admin_room, user_10)
    socket.on(SOCKET_EVENTS.JOIN_ROOM, (room) => {
      socket.join(room);
      console.log(`🔌 Socket ${socket.id} joined room: ${room}`);
      socket.emit('joined_room_ack', { room, status: 'success' });
    });

    socket.on(SOCKET_EVENTS.LEAVE_ROOM, (room) => {
      socket.leave(room);
      console.log(`🔌 Socket ${socket.id} left room: ${room}`);
    });

    // 1. Rider Live GPS Location Update Event
    socket.on(SOCKET_EVENTS.RIDER_LOCATION_UPDATE, async (data) => {
      const { riderId, latitude, longitude, activeOrderId, heading, speed } = data;
      if (!riderId || !latitude || !longitude) return;

      // Update in DB or memory
      if (db.isConnected()) {
        try {
          await db.query(
            'UPDATE delivery_boys SET current_latitude = ?, current_longitude = ?, last_location_updated_at = NOW() WHERE id = ?',
            [latitude, longitude, riderId]
          );
        } catch (e) {
          console.error('Error updating rider location in DB:', e.message);
        }
      } else {
        const r = db.memoryStore.delivery_boys.find((b) => b.id == riderId);
        if (r) {
          r.current_latitude = latitude;
          r.current_longitude = longitude;
        }
      }

      // Broadcast to live tracking customer if active order exists
      if (activeOrderId) {
        io.to(`order_${activeOrderId}`).emit(SOCKET_EVENTS.RIDER_LOCATION_BROADCAST, {
          orderId: activeOrderId,
          riderId,
          latitude,
          longitude,
          heading: heading || 0,
          speed: speed || 0,
          timestamp: new Date().toISOString()
        });
      }

      // Broadcast to Admin Live Fleet Map
      io.to('admin_room').emit('live_fleet_rider_location', {
        riderId,
        latitude,
        longitude,
        activeOrderId,
        timestamp: new Date().toISOString()
      });
    });

    // 2. Rider 30s Countdown Decision (Accept / Reject)
    socket.on(SOCKET_EVENTS.RIDER_RESPONSE_DECISION, async (data) => {
      const { orderId, riderId, decision } = data;
      const result = await dispatchService.handleRiderDecision(orderId, riderId, decision);
      socket.emit('rider_decision_ack', result);
    });

    // 3. Rider Online / Offline Toggle
    socket.on(SOCKET_EVENTS.RIDER_AVAILABILITY_TOGGLE, async (data) => {
      const { riderId, isOnline } = data;
      const statusInt = isOnline ? 1 : 0;

      if (db.isConnected()) {
        await db.query('UPDATE delivery_boys SET is_online = ? WHERE id = ?', [statusInt, riderId]);
      } else {
        const r = db.memoryStore.delivery_boys.find((b) => b.id == riderId);
        if (r) r.is_online = statusInt;
      }

      io.to('admin_room').emit('rider_status_changed', {
        riderId,
        isOnline: !!statusInt
      });
    });

    // 4. Vendor Order Status Change
    socket.on(SOCKET_EVENTS.VENDOR_ORDER_STATUS_UPDATE, async (data) => {
      const { orderId, newStatus, vendorId } = data;
      try {
        const res = await orderService.updateOrderStatus(orderId, newStatus, {
          role: 'vendor',
          vendorId
        });
        socket.emit('vendor_status_ack', res);
      } catch (err) {
        socket.emit('vendor_status_ack', { success: false, message: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket client disconnected: ${socket.id}`);
    });
  });
}

module.exports = {
  registerSocketHandlers
};
