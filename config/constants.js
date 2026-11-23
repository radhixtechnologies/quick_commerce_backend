/**
 * Quick Commerce Global Constants & Enums
 */

module.exports = {
  MODULE_TYPES: {
    FOOD: 'food',
    ECOMMERCE: 'ecommerce',
    SERVICES: 'services', // Urban Company / Urban Clap style on-demand services
    SERVICE_BASED: 'service_based',
    GROCERY: 'grocery'
  },

  VENDOR_CATEGORIES: {
    FOOD: 'food',
    ECOMMERCE: 'ecommerce',
    SERVICE_BASED: 'service_based',
    GROCERY: 'grocery'
  },

  // Role-wise KYC documents required per vendor category
  ROLE_KYC_DOCUMENTS: {
    food: [
      { key: 'fssai_license', label: 'FSSAI Food License', required: true },
      { key: 'gst_certificate', label: 'GST Registration Certificate', required: true },
      { key: 'trade_license', label: 'Shop & Establishment / Trade License', required: true }
    ],
    ecommerce: [
      { key: 'gstin_certificate', label: 'GSTIN Certificate', required: true },
      { key: 'business_pan', label: 'Company / Proprietor PAN Card', required: true },
      { key: 'brand_authorization', label: 'Brand Authorization Letter / Invoice', required: false }
    ],
    service_based: [
      { key: 'aadhaar_card', label: 'Aadhaar / Govt Photo ID', required: true },
      { key: 'police_verification', label: 'Police Verification Certificate', required: true },
      { key: 'skill_certification', label: 'Trade / Skill Certification', required: true }
    ],
    grocery: [
      { key: 'trade_license', label: 'Trade License / Shop Act', required: true },
      { key: 'fssai_retail', label: 'FSSAI Retail Registration', required: true },
      { key: 'gst_udyam', label: 'GST or Udyam MSME Certificate', required: true }
    ]
  },

  // Only Service-Based category requires Mobile OTP verification
  CATEGORY_OTP_REQUIREMENT: {
    service_based: true,
    services: true,
    food: false,
    ecommerce: false,
    grocery: false
  },

  ROLES: {
    CUSTOMER: 'customer',
    VENDOR: 'vendor',
    DELIVERY_BOY: 'delivery_boy',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin'
  },

  ORDER_STATUSES: {
    PLACED: 'placed',
    ACCEPTED: 'accepted',
    PREPARING: 'preparing',
    READY_FOR_PICKUP: 'ready_for_pickup',
    ASSIGNED: 'assigned',
    PICKED_UP: 'picked_up',
    OUT_FOR_DELIVERY: 'out_for_delivery',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    FAILED: 'failed',
    REFUNDED: 'refunded'
  },

  PAYMENT_METHODS: {
    COD: 'COD',
    UPI: 'UPI',
    CARD: 'CARD',
    NET_BANKING: 'NET_BANKING',
    WALLET: 'WALLET'
  },

  PAYMENT_STATUSES: {
    PENDING: 'pending',
    PAID: 'paid',
    FAILED: 'failed',
    REFUNDED: 'refunded'
  },

  VEHICLE_TYPES: {
    BIKE: 'bike',
    SCOOTER: 'scooter',
    CYCLE: 'cycle',
    EV: 'ev'
  },

  NOTIFICATION_CATEGORIES: {
    ORDERS: 'Orders',
    OFFERS: 'Offers',
    GENERAL: 'General'
  },

  SOCKET_EVENTS: {
    // Rooms
    JOIN_ROOM: 'join_room',
    LEAVE_ROOM: 'leave_room',

    // Customer Events
    ORDER_STATUS_CHANGED: 'order_status_changed',
    RIDER_LOCATION_BROADCAST: 'rider_location_broadcast',

    // Vendor Events
    VENDOR_NEW_ORDER_ALERT: 'vendor_new_order_alert',
    VENDOR_ORDER_STATUS_UPDATE: 'vendor_order_status_update',

    // Delivery Boy Events
    RIDER_DISPATCH_REQUEST: 'rider_dispatch_request',
    RIDER_RESPONSE_DECISION: 'rider_response_decision',
    RIDER_LOCATION_UPDATE: 'rider_location_update',
    RIDER_AVAILABILITY_TOGGLE: 'rider_availability_toggle',

    // Admin Dashboard Events
    ADMIN_KPI_UPDATE: 'admin_kpi_update',
    ADMIN_NEW_ORDER_EVENT: 'admin_new_order_event'
  }
};
