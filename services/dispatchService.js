const db = require('../config/db');
const { calculateHaversineDistance } = require('./deliveryRulesEngine');
const { SOCKET_EVENTS } = require('../config/constants');

// Active dispatch queue in memory
// Key: orderId, Value: { orderId, candidateRiderIds, currentIndex, timer, timeoutSec }
const activeDispatches = new Map();

class DispatchService {
  constructor() {
    this.io = null;
    this.countdownSeconds = parseInt(process.env.RIDER_DISPATCH_TIMEOUT_SEC) || 30;
  }

  setSocketIO(io) {
    this.io = io;
  }

  /**
   * Find nearest online and available delivery riders
   */
  async findNearbyRiders(vendorLat, vendorLng, maxRadiusKm = 10) {
    let riders = [];
    if (db.isConnected()) {
      riders = await db.query(
        "SELECT * FROM delivery_boys WHERE is_online = 1 AND approval_status = 'approved' AND (active_order_id IS NULL OR active_order_id = 0)"
      );
    } else {
      riders = db.memoryStore.delivery_boys.filter(
        (r) => r.is_online === 1 && r.approval_status === 'approved' && !r.active_order_id
      );
    }

    const ridersWithDistance = riders
      .map((r) => {
        const dist = calculateHaversineDistance(
          parseFloat(vendorLat),
          parseFloat(vendorLng),
          parseFloat(r.current_latitude || vendorLat),
          parseFloat(r.current_longitude || vendorLng)
        );
        return { ...r, distance_to_vendor_km: dist };
      })
      .filter((r) => r.distance_to_vendor_km <= maxRadiusKm)
      .sort((a, b) => a.distance_to_vendor_km - b.distance_to_vendor_km);

    return ridersWithDistance;
  }

  /**
   * Trigger the 30-second countdown dispatch flow for an order
   */
  async startDispatch(order, vendor) {
    if (activeDispatches.has(order.id)) {
      clearTimeout(activeDispatches.get(order.id).timer);
    }

    const candidateRiders = await this.findNearbyRiders(vendor.latitude, vendor.longitude);

    if (candidateRiders.length === 0) {
      console.warn(`[Dispatch] No online riders found nearby for Order ${order.order_code}`);
      if (this.io) {
        this.io.to('admin_room').emit(SOCKET_EVENTS.ADMIN_NEW_ORDER_EVENT, {
          type: 'DISPATCH_WARNING',
          message: `No delivery boys available within range for order ${order.order_code}`,
          orderId: order.id
        });
      }
      return false;
    }

    const dispatchState = {
      orderId: order.id,
      orderCode: order.order_code,
      vendor,
      order,
      candidateRiders,
      currentIndex: 0,
      timeoutSec: this.countdownSeconds,
      timer: null
    };

    activeDispatches.set(order.id, dispatchState);
    this.dispatchToCurrentCandidate(order.id);
    return true;
  }

  /**
   * Dispatch to the single candidate rider with 30s countdown
   */
  dispatchToCurrentCandidate(orderId) {
    const state = activeDispatches.get(orderId);
    if (!state) return;

    if (state.currentIndex >= state.candidateRiders.length) {
      console.warn(`[Dispatch] All riders either rejected or timed out for Order ${state.orderCode}`);
      if (this.io) {
        this.io.to('admin_room').emit(SOCKET_EVENTS.ADMIN_NEW_ORDER_EVENT, {
          type: 'DISPATCH_EXHAUSTED',
          message: `All riders rejected or missed dispatch for ${state.orderCode}. Admin manual assignment required.`,
          orderId
        });
      }
      activeDispatches.delete(orderId);
      return;
    }

    const targetRider = state.candidateRiders[state.currentIndex];
    console.log(
      `[Dispatch] Offering order ${state.orderCode} to Rider: ${targetRider.full_name} (ID: ${targetRider.id}). 30s timer started.`
    );

    // Emit socket event to the rider's private room
    if (this.io) {
      this.io.to(`rider_${targetRider.id}`).emit(SOCKET_EVENTS.RIDER_DISPATCH_REQUEST, {
        orderId: state.order.id,
        orderCode: state.order.order_code,
        vendorName: state.vendor.business_name,
        vendorAddress: state.vendor.address,
        vendorLat: state.vendor.latitude,
        vendorLng: state.vendor.longitude,
        customerAddress: state.order.delivery_address_json,
        customerLat: state.order.customer_lat,
        customerLng: state.order.customer_lng,
        deliveryEarnings: state.order.delivery_boy_earnings,
        distanceKm: state.order.distance_km,
        countdownSeconds: state.timeoutSec,
        expiresAt: Date.now() + state.timeoutSec * 1000
      });
    }

    // Set 30-second timeout fallback
    state.timer = setTimeout(() => {
      console.log(
        `[Dispatch] 30s countdown expired for Rider ${targetRider.full_name} on Order ${state.orderCode}. Rolling to next rider.`
      );
      state.currentIndex += 1;
      this.dispatchToCurrentCandidate(orderId);
    }, state.timeoutSec * 1000);
  }

  /**
   * Rider responds (accepts or rejects)
   */
  async handleRiderDecision(orderId, riderId, decision) {
    const state = activeDispatches.get(orderId);
    if (!state) return { success: false, message: 'Dispatch session expired or order already assigned' };

    const currentRider = state.candidateRiders[state.currentIndex];
    if (!currentRider || currentRider.id != riderId) {
      return { success: false, message: 'Invalid rider or turn expired' };
    }

    // Clear timer
    clearTimeout(state.timer);

    if (decision === 'accept') {
      console.log(`[Dispatch] Rider ${currentRider.full_name} ACCEPTED Order ${state.orderCode}`);

      // Update Order in DB / Memory
      if (db.isConnected()) {
        await db.query(
          "UPDATE orders SET delivery_boy_id = ?, order_status = 'assigned', assigned_at = NOW() WHERE id = ?",
          [riderId, orderId]
        );
        await db.query('UPDATE delivery_boys SET active_order_id = ? WHERE id = ?', [orderId, riderId]);
        await db.query(
          "INSERT INTO order_status_logs (order_id, status, notes) VALUES (?, 'assigned', ?)",
          [orderId, `Rider ${currentRider.full_name} accepted order assignment.`]
        );
      } else {
        const ord = db.memoryStore.orders.find((o) => o.id == orderId);
        if (ord) {
          ord.delivery_boy_id = riderId;
          ord.rider_name = currentRider.full_name;
          ord.order_status = 'assigned';
        }
        currentRider.active_order_id = orderId;
      }

      // Notify Customer, Vendor, and Rider
      if (this.io) {
        this.io.to(`order_${orderId}`).emit(SOCKET_EVENTS.ORDER_STATUS_CHANGED, {
          orderId,
          orderStatus: 'assigned',
          riderName: currentRider.full_name,
          riderPhone: currentRider.phone,
          vehicleType: currentRider.vehicle_type,
          vehicleNumber: currentRider.vehicle_number,
          message: `Delivery hero ${currentRider.full_name} is on the way to pick up your order!`
        });

        this.io.to(`vendor_${state.vendor.id}`).emit(SOCKET_EVENTS.VENDOR_ORDER_STATUS_UPDATE, {
          orderId,
          orderStatus: 'assigned',
          riderName: currentRider.full_name,
          riderPhone: currentRider.phone
        });

        this.io.to('admin_room').emit(SOCKET_EVENTS.ADMIN_NEW_ORDER_EVENT, {
          type: 'ORDER_ASSIGNED',
          orderId,
          riderId,
          riderName: currentRider.full_name
        });
      }

      activeDispatches.delete(orderId);
      return { success: true, message: 'Order successfully assigned to you' };
    } else {
      console.log(`[Dispatch] Rider ${currentRider.full_name} REJECTED Order ${state.orderCode}`);
      state.currentIndex += 1;
      this.dispatchToCurrentCandidate(orderId);
      return { success: true, message: 'Order rejected, routed to next rider' };
    }
  }
}

module.exports = new DispatchService();
