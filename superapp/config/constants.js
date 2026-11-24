/**
 * Super App Global Constants, Enums & Ecosystem Specs
 * Reused & Extended from Radhix Technologies Quick Commerce Core
 */

module.exports = {
  // 6 Primary Service Pillars of the Super App
  SERVICE_PILLARS: [
    {
      id: 'food',
      name: 'Food Delivery',
      tagline: 'Hot & fresh gourmet meals from top restaurants',
      eta: '20-35 mins',
      icon: 'UtensilsCrossed',
      badge: 'Bestseller',
      color: '#F97316'
    },
    {
      id: 'grocery',
      name: 'Quick Grocery',
      tagline: '10-minute essentials, fresh veggies & daily milk',
      eta: '10-15 mins',
      icon: 'ShoppingBag',
      badge: 'Ultra-Fast',
      color: '#16A34A'
    },
    {
      id: 'services',
      name: 'Home Services',
      tagline: 'Professional salon, cleaning, plumbing & AC repair at home',
      eta: 'Scheduled & Instant',
      icon: 'Wrench',
      badge: 'Certified Pros',
      color: '#0EA5E9'
    },
    {
      id: 'rides',
      name: 'Instant Rides',
      tagline: 'Safe, affordable bikes, autos & comfortable cabs',
      eta: '3-5 mins pickup',
      icon: 'Car',
      badge: 'Zero Surge',
      color: '#F59E0B'
    },
    {
      id: 'ecommerce',
      name: 'E-commerce Shopping',
      tagline: 'Electronics, fashion, kitchenware & lifestyle brands',
      eta: 'Same Day / Scheduled',
      icon: 'Package',
      badge: 'Curated Deals',
      color: '#8B5CF6'
    },
    {
      id: 'medicine',
      name: 'Medicine & Pharmacy',
      tagline: 'Upload doctor prescription & get authentic medicines',
      eta: '15-45 mins',
      icon: 'Pill',
      badge: 'Rx Verified',
      color: '#EC4899'
    }
  ],

  DELIVERY_TYPES: {
    QUICK: 'quick',        // 10-30 min hyper-local dispatch
    SCHEDULED: 'scheduled' // Pick future date and time slot
  },

  ROLES: {
    CUSTOMER: 'customer',
    VENDOR: 'vendor',
    DELIVERY_BOY: 'delivery_boy',
    ADMIN: 'admin'
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
    CANCELLED: 'cancelled'
  },

  PAYMENT_METHODS: {
    COD: 'COD',
    UPI: 'UPI',
    CARD: 'CARD',
    WALLET: 'WALLET',
    NET_BANKING: 'NET_BANKING'
  },

  VEHICLE_TYPES: {
    BIKE: 'bike',
    SCOOTER: 'scooter',
    CYCLE: 'cycle',
    EV: 'ev'
  },

  ROLE_KYC_DOCUMENTS: {
    food: [
      { key: 'fssai_license', label: 'FSSAI Food License', required: true },
      { key: 'gst_certificate', label: 'GST Registration Certificate', required: true }
    ],
    grocery: [
      { key: 'trade_license', label: 'Trade License / Shop Act', required: true },
      { key: 'fssai_retail', label: 'FSSAI Retail Registration', required: true }
    ],
    services: [
      { key: 'aadhaar_card', label: 'Aadhaar / Govt Photo ID', required: true },
      { key: 'police_verification', label: 'Police Verification Certificate', required: true },
      { key: 'skill_certification', label: 'Trade / Skill Certification', required: true }
    ],
    rides: [
      { key: 'driving_license', label: 'Commercial Driving License', required: true },
      { key: 'vehicle_rc', label: 'Vehicle Registration (RC)', required: true },
      { key: 'vehicle_insurance', label: 'Valid Commercial Insurance', required: true }
    ],
    ecommerce: [
      { key: 'gstin_certificate', label: 'GSTIN Certificate', required: true },
      { key: 'business_pan', label: 'Company / Proprietor PAN Card', required: true }
    ],
    medicine: [
      { key: 'drug_license', label: 'Valid Drug License (Form 20/21)', required: true },
      { key: 'pharmacist_registration', label: 'Registered Pharmacist Certificate', required: true }
    ]
  }
};
