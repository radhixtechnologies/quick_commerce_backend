const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;
let isConnected = false;

// In-memory fallback dataset matching schema seeds if MySQL is offline
const memoryStore = {
  users: [
    { id: 1, name: 'Super Administrator', email: 'superadmin@quickcommerce.com', phone: '+919999900001', role: 'super_admin', status: 'active', password_hash: '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW' },
    { id: 2, name: 'Operations Admin', email: 'admin@quickcommerce.com', phone: '+919999900002', role: 'admin', status: 'active', password_hash: '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW' },
    { id: 3, name: 'Spice Hub Owner', email: 'vendor1@spicehub.com', phone: '+919999900003', role: 'vendor', status: 'active', password_hash: '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW' },
    { id: 4, name: 'Fresh Mart Grocery', email: 'vendor2@freshmart.com', phone: '+919999900004', role: 'vendor', status: 'active', password_hash: '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW' },
    { id: 5, name: 'Daily Needs Mart', email: 'vendor3@dailyneeds.com', phone: '+919999900005', role: 'vendor', status: 'active', password_hash: '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW' },
    { id: 6, name: 'Sweet Delights Bakery', email: 'vendor4@sweetdelights.com', phone: '+919999900006', role: 'vendor', status: 'active', password_hash: '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW' },
    { id: 7, name: 'Rahul Khan', email: 'rider1@quickcommerce.com', phone: '+919999900007', role: 'delivery_boy', status: 'active', password_hash: '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW' },
    { id: 8, name: 'Amit Sharma', email: 'rider2@quickcommerce.com', phone: '+919999900008', role: 'delivery_boy', status: 'active', password_hash: '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW' },
    { id: 9, name: 'Vikram Yadav', email: 'rider3@quickcommerce.com', phone: '+919999900009', role: 'delivery_boy', status: 'active', password_hash: '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW' },
    { id: 10, name: 'Neha Verma', email: 'customer1@gmail.com', phone: '+919999900010', role: 'customer', status: 'active', password_hash: '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW' },
    { id: 11, name: 'Pooja Singh', email: 'customer2@gmail.com', phone: '+919999900011', role: 'customer', status: 'active', password_hash: '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW' }
  ],
  vendors: [
    {
      id: 1,
      user_id: 3,
      business_name: 'Spice Hub Restaurant',
      business_type: 'food',
      vendor_category: 'food',
      phone: '+919999900003',
      email: 'vendor1@spicehub.com',
      city: 'Noida',
      address: 'Shop 12, Sector 62 Market',
      latitude: 28.6280,
      longitude: 77.3649,
      service_radius_km: 8.0,
      opening_time: '10:00:00',
      closing_time: '23:00:00',
      is_open: 1,
      commission_rate: 15.0,
      min_order_amount: 149.0,
      approval_status: 'approved',
      is_otp_verified: 0, // No OTP needed for food
      rating: 4.90,
      total_reviews: 320,
      total_orders: 1245,
      total_revenue: 482500,
      is_featured: 1,
      documents_json: {
        fssai_license: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=400&q=80',
        gst_certificate: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80',
        trade_license: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=400&q=80'
      },
      document_verification_json: {
        fssai_license: 'approved',
        gst_certificate: 'approved',
        trade_license: 'approved'
      },
      bank_details_json: {
        account_holder: 'Spice Hub Hospitality Pvt Ltd',
        account_no: '918237465019',
        ifsc: 'HDFC0001234',
        upi_id: 'spicehub@okhdfcbank'
      }
    },
    {
      id: 2,
      user_id: 4,
      business_name: 'Fresh Mart Supermarket',
      business_type: 'grocery',
      vendor_category: 'grocery',
      phone: '+919999900004',
      email: 'vendor2@freshmart.com',
      city: 'Noida',
      address: 'Block B, Sector 62',
      latitude: 28.6295,
      longitude: 77.3670,
      service_radius_km: 10.0,
      opening_time: '06:30:00',
      closing_time: '23:30:00',
      is_open: 1,
      commission_rate: 12.0,
      min_order_amount: 99.0,
      approval_status: 'approved',
      is_otp_verified: 0, // No OTP needed for grocery
      rating: 4.85,
      total_reviews: 290,
      total_orders: 980,
      total_revenue: 321400,
      is_featured: 1,
      documents_json: {
        trade_license: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=400&q=80',
        fssai_retail: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=400&q=80',
        gst_udyam: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80'
      },
      document_verification_json: {
        trade_license: 'approved',
        fssai_retail: 'approved',
        gst_udyam: 'approved'
      },
      bank_details_json: {
        account_holder: 'Fresh Mart Retail Enterprise',
        account_no: '881920394857',
        ifsc: 'ICIC0000987',
        upi_id: 'freshmart@icici'
      }
    },
    {
      id: 3,
      user_id: 5,
      business_name: 'Urban Pro Home Services',
      business_type: 'service_based',
      vendor_category: 'service_based',
      phone: '+919999900005',
      email: 'vendor3@urbanpro.com',
      city: 'Noida',
      address: 'Main High Street, Sector 63',
      latitude: 28.6310,
      longitude: 77.3710,
      service_radius_km: 12.0,
      opening_time: '08:00:00',
      closing_time: '21:00:00',
      is_open: 1,
      commission_rate: 18.0,
      min_order_amount: 199.0,
      approval_status: 'approved',
      is_otp_verified: 1, // MANDATORY Mobile OTP Verified ✓ for service_based
      rating: 4.94,
      total_reviews: 185,
      total_orders: 720,
      total_revenue: 384000,
      is_featured: 1,
      documents_json: {
        aadhaar_card: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=400&q=80',
        police_verification: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=400&q=80',
        skill_certification: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80'
      },
      document_verification_json: {
        aadhaar_card: 'approved',
        police_verification: 'approved',
        skill_certification: 'approved'
      },
      bank_details_json: {
        account_holder: 'Urban Pro Services LLP',
        account_no: '334901827461',
        ifsc: 'SBIN0005432',
        upi_id: 'urbanpro@sbi'
      }
    },
    {
      id: 4,
      user_id: 6,
      business_name: 'TrendVibe E-Commerce Hub',
      business_type: 'ecommerce',
      vendor_category: 'ecommerce',
      phone: '+919999900006',
      email: 'vendor4@trendvibe.com',
      city: 'Noida',
      address: 'Plot 4, Sector 62 Metro Hub',
      latitude: 28.6272,
      longitude: 77.3625,
      service_radius_km: 15.0,
      opening_time: '09:00:00',
      closing_time: '22:00:00',
      is_open: 1,
      commission_rate: 10.0,
      min_order_amount: 299.0,
      approval_status: 'approved',
      is_otp_verified: 0, // No OTP needed for ecommerce
      rating: 4.88,
      total_reviews: 215,
      total_orders: 890,
      total_revenue: 540000,
      is_featured: 1,
      documents_json: {
        gstin_certificate: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80',
        business_pan: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=400&q=80',
        brand_authorization: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=400&q=80'
      },
      document_verification_json: {
        gstin_certificate: 'approved',
        business_pan: 'approved',
        brand_authorization: 'approved'
      },
      bank_details_json: {
        account_holder: 'TrendVibe Digital Commerce',
        account_no: '772910485920',
        ifsc: 'KKBK0004321',
        upi_id: 'trendvibe@kotak'
      }
    }
  ],
  otps: [
    // Pre-seeded OTP test storage
    { phone: '+919999900005', otp: '123456', verified: true, expires_at: Date.now() + 86400000 }
  ],
  delivery_boys: [
    { id: 1, user_id: 7, full_name: 'Rahul Khan', phone: '+919999900007', email: 'rider1@quickcommerce.com', vehicle_type: 'bike', vehicle_number: 'UP16-AB-1234', approval_status: 'approved', is_online: 1, current_latitude: 28.6285, current_longitude: 77.3655, rating: 4.95, total_deliveries: 412, wallet_balance: 1450.0, total_cod_collected: 680.0 },
    { id: 2, user_id: 8, full_name: 'Amit Sharma', phone: '+919999900008', email: 'rider2@quickcommerce.com', vehicle_type: 'scooter', vehicle_number: 'UP16-CD-5678', approval_status: 'approved', is_online: 1, current_latitude: 28.6290, current_longitude: 77.3662, rating: 4.88, total_deliveries: 385, wallet_balance: 1220.0, total_cod_collected: 450.0 },
    { id: 3, user_id: 9, full_name: 'Vikram Yadav', phone: '+919999900009', email: 'rider3@quickcommerce.com', vehicle_type: 'ev', vehicle_number: 'UP16-EV-9012', approval_status: 'approved', is_online: 1, current_latitude: 28.6300, current_longitude: 77.3680, rating: 4.90, total_deliveries: 290, wallet_balance: 980.0, total_cod_collected: 0.0 }
  ],
  categories: [
    // 1. FOOD CATEGORIES
    { id: 1, name: 'North Indian & Meals', slug: 'north-indian-meals', module_type: 'food', is_active: 1, sort_order: 1, icon_url: '🍲', description: 'Curries, biryanis, gravies and thalis' },
    { id: 2, name: 'Fast Food, Burgers & Pizza', slug: 'fast-food-pizza', module_type: 'food', is_active: 1, sort_order: 2, icon_url: '🍔', description: 'Burgers, cheesy pizzas, wraps and fries' },
    { id: 3, name: 'Bakery, Cakes & Desserts', slug: 'bakery-cakes-desserts', module_type: 'food', is_active: 1, sort_order: 3, icon_url: '🎂', description: 'Fresh birthday cakes, pastries and brownies' },

    // 2. E-COMMERCE CATEGORIES
    { id: 4, name: 'Fashion & Apparel', slug: 'fashion-apparel', module_type: 'ecommerce', is_active: 1, sort_order: 4, icon_url: '👕', description: "Men's, women's, footwear and clothing accessories" },
    { id: 5, name: 'Electronics & Mobile Gadgets', slug: 'electronics-gadgets', module_type: 'ecommerce', is_active: 1, sort_order: 5, icon_url: '📱', description: 'Smartwatches, headphones, chargers and powerbanks' },
    { id: 6, name: 'Home & Kitchen Essentials', slug: 'home-kitchen', module_type: 'ecommerce', is_active: 1, sort_order: 6, icon_url: '🍳', description: 'Cookware, storage, home decor and bedding' },
    { id: 7, name: 'Beauty & Personal Care', slug: 'beauty-personal-care', module_type: 'ecommerce', is_active: 1, sort_order: 7, icon_url: '💄', description: 'Skincare, perfumes, hair styling and grooming' },

    // 3. SERVICE BASED (URBAN CLAP STYLE)
    { id: 8, name: 'Home Cleaning & Pest Control', slug: 'home-cleaning-pest-control', module_type: 'services', is_active: 1, sort_order: 8, icon_url: '🧹', description: 'Full home deep cleaning, kitchen, bathroom & pest control' },
    { id: 9, name: 'Electrician, Plumber & Carpenter', slug: 'electrician-plumber-carpenter', module_type: 'services', is_active: 1, sort_order: 9, icon_url: '🔧', description: 'Doorstep wiring repairs, plumbing fixes and woodwork' },
    { id: 10, name: 'AC & Appliance Repair', slug: 'ac-appliance-repair', module_type: 'services', is_active: 1, sort_order: 10, icon_url: '❄️', description: 'AC servicing, gas refill, washing machine and RO service' },
    { id: 11, name: 'Salon & Spa for Men & Women', slug: 'salon-spa-grooming', module_type: 'services', is_active: 1, sort_order: 11, icon_url: '💇', description: 'Haircut, facial, waxing, cleanup and body massage' },

    // 4. GROCERY CATEGORIES
    { id: 12, name: 'Fruits & Vegetables', slug: 'fruits-vegetables', module_type: 'grocery', is_active: 1, sort_order: 12, icon_url: '🥦', description: 'Farm fresh green veggies and organic juicy fruits' },
    { id: 13, name: 'Dairy, Bread & Eggs', slug: 'dairy-bread-eggs', module_type: 'grocery', is_active: 1, sort_order: 13, icon_url: '🥛', description: 'Farm milk, butter, paneer, brown bread and eggs' },
    { id: 14, name: 'Atta, Rice, Oil & Dals', slug: 'atta-rice-oil-dals', module_type: 'grocery', is_active: 1, sort_order: 14, icon_url: '🌾', description: 'Chakki fresh atta, aged basmati, pulses and cooking oils' },
    { id: 15, name: 'Snacks & Beverages', slug: 'snacks-beverages', module_type: 'grocery', is_active: 1, sort_order: 15, icon_url: '🥤', description: 'Chips, namkeen, cold drinks, juices and cookies' }
  ],
  subcategories: [
    // Subcategories for Food
    { id: 1, category_id: 1, name: 'Main Course Curries & Dal', slug: 'main-course-curries', is_active: 1, sort_order: 1 },
    { id: 2, category_id: 1, name: 'Biryani, Pulao & Rice', slug: 'biryani-pulao-rice', is_active: 1, sort_order: 2 },
    { id: 3, category_id: 1, name: 'Tandoori Kebabs & Starters', slug: 'tandoori-kebabs', is_active: 1, sort_order: 3 },
    { id: 4, category_id: 2, name: 'Crispy Burgers & Wraps', slug: 'crispy-burgers-wraps', is_active: 1, sort_order: 1 },
    { id: 5, category_id: 2, name: 'Cheesy Gourmet Pizzas', slug: 'cheesy-pizzas', is_active: 1, sort_order: 2 },
    { id: 6, category_id: 2, name: 'Fries & Sides', slug: 'fries-sides', is_active: 1, sort_order: 3 },
    { id: 7, category_id: 3, name: 'Birthday & Custom Cakes', slug: 'birthday-cakes', is_active: 1, sort_order: 1 },
    { id: 8, category_id: 3, name: 'Pastries & Cheesecakes', slug: 'pastries-cheesecakes', is_active: 1, sort_order: 2 },

    // Subcategories for E-commerce
    { id: 9, category_id: 4, name: "Men's Casual & Formal Wear", slug: 'mens-wear', is_active: 1, sort_order: 1 },
    { id: 10, category_id: 4, name: "Women's Ethnic & Western", slug: 'womens-wear', is_active: 1, sort_order: 2 },
    { id: 11, category_id: 4, name: 'Footwear & Sneakers', slug: 'footwear-sneakers', is_active: 1, sort_order: 3 },
    { id: 12, category_id: 5, name: 'Smartwatches & Fitness Trackers', slug: 'smartwatches', is_active: 1, sort_order: 1 },
    { id: 13, category_id: 5, name: 'Wireless Earbuds & Headphones', slug: 'earbuds-headphones', is_active: 1, sort_order: 2 },
    { id: 14, category_id: 5, name: 'Fast Chargers & Cables', slug: 'chargers-cables', is_active: 1, sort_order: 3 },
    { id: 15, category_id: 6, name: 'Cookware & Kitchen Utensils', slug: 'cookware-kitchen', is_active: 1, sort_order: 1 },
    { id: 16, category_id: 6, name: 'Home Decor & Lighting', slug: 'home-decor-lighting', is_active: 1, sort_order: 2 },
    { id: 17, category_id: 7, name: 'Skincare & Sunscreen', slug: 'skincare-sunscreen', is_active: 1, sort_order: 1 },
    { id: 18, category_id: 7, name: 'Hair Care & Fragrances', slug: 'haircare-fragrances', is_active: 1, sort_order: 2 },

    // Subcategories for Services (Urban Clap Style)
    { id: 19, category_id: 8, name: 'Full Home Deep Cleaning', slug: 'full-home-deep-cleaning', is_active: 1, sort_order: 1 },
    { id: 20, category_id: 8, name: 'Kitchen & Bathroom Cleaning', slug: 'kitchen-bathroom-cleaning', is_active: 1, sort_order: 2 },
    { id: 21, category_id: 8, name: 'Pest & Termite Control Treatment', slug: 'pest-control', is_active: 1, sort_order: 3 },
    { id: 22, category_id: 9, name: 'Electrician & Wiring Repair', slug: 'electrician-services', is_active: 1, sort_order: 1 },
    { id: 23, category_id: 9, name: 'Plumbing & Water Leakage Fixes', slug: 'plumbing-services', is_active: 1, sort_order: 2 },
    { id: 24, category_id: 9, name: 'Carpenter & Furniture Assembly', slug: 'carpenter-services', is_active: 1, sort_order: 3 },
    { id: 25, category_id: 10, name: 'AC Foam Jet Service & Gas Charging', slug: 'ac-service-repair', is_active: 1, sort_order: 1 },
    { id: 26, category_id: 10, name: 'Washing Machine & RO Purifier Repair', slug: 'washing-machine-ro-repair', is_active: 1, sort_order: 2 },
    { id: 27, category_id: 11, name: "Men's Grooming, Haircut & Beard", slug: 'mens-salon-grooming', is_active: 1, sort_order: 1 },
    { id: 28, category_id: 11, name: "Women's Salon, Waxing & Facial", slug: 'womens-salon-facial', is_active: 1, sort_order: 2 },
    { id: 29, category_id: 11, name: 'Therapeutic Body Massage & Spa', slug: 'body-massage-spa', is_active: 1, sort_order: 3 },

    // Subcategories for Grocery
    { id: 30, category_id: 12, name: 'Fresh Farm Vegetables', slug: 'fresh-vegetables', is_active: 1, sort_order: 1 },
    { id: 31, category_id: 12, name: 'Fresh Organic Fruits', slug: 'fresh-fruits', is_active: 1, sort_order: 2 },
    { id: 32, category_id: 13, name: 'Pasteurized Full Cream Milk', slug: 'milk-cream', is_active: 1, sort_order: 1 },
    { id: 33, category_id: 13, name: 'Fresh Paneer, Butter & Cheese', slug: 'paneer-butter-cheese', is_active: 1, sort_order: 2 },
    { id: 34, category_id: 14, name: 'Chakki Fresh Atta & Grains', slug: 'atta-flours', is_active: 1, sort_order: 1 },
    { id: 35, category_id: 14, name: 'Basmati Rice & Cooking Oils', slug: 'rice-oils', is_active: 1, sort_order: 2 },
    { id: 36, category_id: 15, name: 'Chips, Namkeen & Savouries', slug: 'chips-namkeen', is_active: 1, sort_order: 1 },
    { id: 37, category_id: 15, name: 'Juices, Sodas & Energy Drinks', slug: 'cold-drinks-juices', is_active: 1, sort_order: 2 }
  ],
  products: [
    {
      id: 1,
      vendor_id: 2,
      category_id: 2,
      subcategory_id: 4,
      name: 'Fresh Farm Milk 500ml',
      price: 35.0,
      discount_price: 32.0,
      stock: 150,
      unit: 'pack',
      is_available: 1,
      is_featured: 1,
      approval_status: 'approved',
      rating: 4.90,
      total_reviews: 480,
      food_type: 'veg',
      image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
      raw_image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
      ai_generated_image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=90',
      ai_generated_video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      variations: [{ name: '500ml', price: 32 }, { name: '1000ml', price: 62 }],
      addons: []
    },
    {
      id: 2,
      vendor_id: 2,
      category_id: 1,
      subcategory_id: 1,
      name: 'Fresh Hybrid Tomatoes',
      price: 45.0,
      discount_price: 40.0,
      stock: 200,
      unit: '1 kg',
      is_available: 1,
      is_featured: 1,
      approval_status: 'approved',
      rating: 4.80,
      total_reviews: 210,
      food_type: 'veg',
      image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
      raw_image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
      ai_generated_image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=90',
      ai_generated_video_url: null,
      variations: [{ name: '500g', price: 22 }, { name: '1kg', price: 40 }],
      addons: []
    },
    {
      id: 3,
      vendor_id: 2,
      category_id: 1,
      subcategory_id: 2,
      name: 'Robusta Bananas',
      price: 70.0,
      discount_price: 60.0,
      stock: 120,
      unit: '1 dozen',
      is_available: 1,
      is_featured: 1,
      approval_status: 'approved',
      rating: 4.85,
      total_reviews: 140,
      food_type: 'veg',
      image_url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80',
      raw_image_url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80',
      ai_generated_image_url: null,
      ai_generated_video_url: null,
      variations: [{ name: '6 pcs', price: 32 }, { name: '12 pcs', price: 60 }],
      addons: []
    },
    {
      id: 4,
      vendor_id: 2,
      category_id: 3,
      subcategory_id: 8,
      name: 'Premium Basmati Rice',
      price: 320.0,
      discount_price: 299.0,
      stock: 80,
      unit: '1 kg',
      is_available: 1,
      is_featured: 1,
      approval_status: 'approved',
      rating: 4.90,
      total_reviews: 310,
      food_type: 'veg',
      image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
      raw_image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
      ai_generated_image_url: null,
      ai_generated_video_url: null,
      variations: [{ name: '1kg', price: 299 }, { name: '5kg', price: 1399 }],
      addons: []
    },
    {
      id: 5,
      vendor_id: 1,
      category_id: 5,
      subcategory_id: 14,
      name: 'Butter Paneer Masala Gravy',
      price: 280.0,
      discount_price: 249.0,
      stock: 50,
      unit: 'serving',
      is_available: 1,
      is_featured: 1,
      approval_status: 'approved',
      rating: 4.92,
      total_reviews: 520,
      food_type: 'veg',
      image_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
      raw_image_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
      ai_generated_image_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=90',
      ai_generated_video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      variations: [{ name: 'Regular', price: 249 }, { name: 'Large', price: 349 }],
      addons: [{ name: 'Extra Butter', price: 25 }, { name: 'Extra Cheese', price: 35 }]
    },
    {
      id: 6,
      vendor_id: 1,
      category_id: 5,
      subcategory_id: 15,
      name: 'Tandoori Chicken Tikka Platter',
      price: 290.0,
      discount_price: 249.0,
      stock: 40,
      unit: 'plate',
      is_available: 1,
      is_featured: 1,
      approval_status: 'approved',
      rating: 4.88,
      total_reviews: 360,
      food_type: 'non_veg',
      image_url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80',
      raw_image_url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80',
      ai_generated_image_url: null,
      ai_generated_video_url: null,
      variations: [{ name: '6 Pcs', price: 249 }, { name: '12 Pcs', price: 449 }],
      addons: [{ name: 'Rumali Roti (2 pcs)', price: 40 }]
    },
    {
      id: 7,
      vendor_id: 3,
      category_id: 10,
      subcategory_id: 25,
      name: 'AC Foam Jet Deep Servicing',
      price: 699.0,
      discount_price: 499.0,
      stock: 20,
      unit: 'service',
      is_available: 1,
      is_featured: 1,
      approval_status: 'approved',
      rating: 4.95,
      total_reviews: 280,
      food_type: 'veg',
      image_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
      raw_image_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
      ai_generated_image_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=90',
      ai_generated_video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      variations: [{ name: 'Split AC', price: 499 }, { name: 'Window AC', price: 399 }],
      addons: [{ name: 'Indoor Coil Sanitization', price: 99 }, { name: 'Gas Leak Check', price: 149 }]
    },
    {
      id: 8,
      vendor_id: 4,
      category_id: 5,
      subcategory_id: 13,
      name: 'Active Noise Cancelling TWS Earbuds',
      price: 1999.0,
      discount_price: 1499.0,
      stock: 65,
      unit: 'piece',
      is_available: 1,
      is_featured: 1,
      approval_status: 'approved',
      rating: 4.89,
      total_reviews: 195,
      food_type: 'veg',
      image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80',
      raw_image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80',
      ai_generated_image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=90',
      ai_generated_video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      variations: [{ name: 'Midnight Black', price: 1499 }, { name: 'Frost White', price: 1499 }],
      addons: [{ name: '1-Year Extended Warranty', price: 199 }]
    }
  ],
  ai_settings: {
    enabled_categories: ['food', 'ecommerce', 'service_based', 'grocery'],
    monthly_quota_per_vendor: 50,
    model: 'gemini-1.5-flash',
    features: {
      image_enhancement: true,
      promo_video: true,
      partner_support_chat: true
    }
  },
  delivery_charge_slabs: [
    { id: 1, min_distance_km: 0.0, max_distance_km: 3.0, charge: 20.0, is_available: 1, title: '0 - 3 KM (Ultra-fast)', sort_order: 1 },
    { id: 2, min_distance_km: 3.01, max_distance_km: 5.0, charge: 30.0, is_available: 1, title: '3 - 5 KM (Local Hub)', sort_order: 2 },
    { id: 3, min_distance_km: 5.01, max_distance_km: 7.0, charge: 40.0, is_available: 1, title: '5 - 7 KM (City Reach)', sort_order: 3 },
    { id: 4, min_distance_km: 7.01, max_distance_km: 10.0, charge: 50.0, is_available: 1, title: '7 - 10 KM (Extended Area)', sort_order: 4 },
    { id: 5, min_distance_km: 10.01, max_distance_km: 99.0, charge: 0.0, is_available: 0, title: '10 KM+ (Not Available)', sort_order: 5 }
  ],
  orders: [
    { id: 1, order_code: '#ORD1256', customer_id: 10, customer_name: 'Amit Sharma', vendor_id: 1, vendor_name: 'Spice Hub', delivery_boy_id: 2, rider_name: 'Amit Sharma', amount: 498.0, subtotal: 498.0, discount_amount: 50.0, delivery_charge: 20.0, payment_method: 'UPI', payment_status: 'paid', order_status: 'preparing', delivery_otp: '4521', distance_km: 2.1, created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(), items_count: 2 },
    { id: 2, order_code: '#ORD1255', customer_id: 10, customer_name: 'Neha Verma', vendor_id: 2, vendor_name: 'Fresh Mart', delivery_boy_id: 1, rider_name: 'Rahul Khan', amount: 697.0, subtotal: 697.0, discount_amount: 0.0, delivery_charge: 0.0, payment_method: 'CARD', payment_status: 'paid', order_status: 'out_for_delivery', delivery_otp: '8912', distance_km: 3.2, created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(), items_count: 5 },
    { id: 3, order_code: '#ORD1254', customer_id: 11, customer_name: 'Rahul Khan', vendor_id: 3, vendor_name: 'Daily Needs', delivery_boy_id: 1, rider_name: 'Rahul Khan', amount: 249.0, subtotal: 249.0, discount_amount: 30.0, delivery_charge: 20.0, payment_method: 'COD', payment_status: 'paid', order_status: 'delivered', delivery_otp: '3301', distance_km: 1.8, created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), items_count: 1 },
    { id: 4, order_code: '#ORD1253', customer_id: 11, customer_name: 'Pooja Singh', vendor_id: 2, vendor_name: 'Green Store', delivery_boy_id: null, rider_name: 'Unassigned', amount: 399.0, subtotal: 399.0, discount_amount: 0.0, delivery_charge: 20.0, payment_method: 'COD', payment_status: 'failed', order_status: 'cancelled', delivery_otp: '6741', distance_km: 2.4, created_at: new Date(Date.now() - 1000 * 60 * 80).toISOString(), items_count: 8 },
    { id: 5, order_code: '#ORD1252', customer_id: 10, customer_name: 'Vikram Yadav', vendor_id: 1, vendor_name: 'Super Market', delivery_boy_id: 3, rider_name: 'Vikram Yadav', amount: 549.0, subtotal: 549.0, discount_amount: 0.0, delivery_charge: 20.0, payment_method: 'UPI', payment_status: 'paid', order_status: 'preparing', delivery_otp: '9045', distance_km: 2.1, created_at: new Date(Date.now() - 1000 * 60 * 110).toISOString(), items_count: 2 }
  ],
  coupons: [
    { id: 1, code: 'WELCOME50', title: 'Flat 50% Off First Order', discount_type: 'percentage', discount_value: 50.0, min_order_amount: 149.0, max_discount_amount: 100.0, usage_limit_total: 5000, used_count: 320, is_active: 1, valid_until: '2027-12-31' },
    { id: 2, code: 'QUICK30', title: 'Flat ₹30 Instant Cashback', discount_type: 'fixed', discount_value: 30.0, min_order_amount: 199.0, max_discount_amount: 30.0, usage_limit_total: 10000, used_count: 1420, is_active: 1, valid_until: '2027-12-31' },
    { id: 3, code: 'FREESHIP', title: 'Free Delivery Above ₹199', discount_type: 'percentage', discount_value: 100.0, min_order_amount: 199.0, max_discount_amount: 50.0, usage_limit_total: 2000, used_count: 850, is_active: 1, valid_until: '2027-12-31' }
  ],
  banners: [
    { id: 1, title: '10-Minute Grocery Delivery Guaranteed!', banner_type: 'home', image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80', is_active: 1, sort_order: 1 },
    { id: 2, title: 'Flat 50% Off On Delicious Restaurant Curries', banner_type: 'promotional', image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80', is_active: 1, sort_order: 2 },
    { id: 3, title: 'Fresh Morning Bakery Bakes & Birthday Treats', banner_type: 'offer', image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80', is_active: 1, sort_order: 3 }
  ],
  notifications: [
    { id: 1, user_id: 10, recipient_role: 'customer', category: 'Orders', title: 'Order #ORD1256 is Preparing', body: 'Chef at Spice Hub is cooking your delicious meal!', created_at: new Date().toISOString() },
    { id: 2, user_id: 10, recipient_role: 'customer', category: 'Offers', title: 'Midnight Craving Deal!', body: 'Get flat ₹50 off on bakery and dessert items tonight!', created_at: new Date().toISOString() },
    { id: 3, user_id: null, recipient_role: 'all', category: 'General', title: 'Monsoon Delivery Advisory', body: 'All delivery heroes are equipped with waterproof gear.', created_at: new Date().toISOString() }
  ],
  settings: {
    app_name: 'Quick Commerce Multi-Vendor',
    free_delivery_threshold: '299.00',
    default_delivery_charge: '25.00',
    max_delivery_radius_km: '10.00',
    rider_dispatch_countdown_sec: '30',
    auto_assign_delivery_boy: 'true',
    default_commission_rate: '15.00',
    platform_fee: '5.00',
    tax_percentage: '5.00',
    cod_enabled: 'true',
    online_payment_enabled: 'true'
  }
};

let reconnectTimer = null;

async function initDB() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'quick_commerce_db',
      port: Number(process.env.DB_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0
    });

    const conn = await pool.getConnection();
    isConnected = true;
    console.log('✅ Connected to MySQL Database [quick_commerce_db] successfully.');
    conn.release();

    if (reconnectTimer) {
      clearInterval(reconnectTimer);
      reconnectTimer = null;
    }
  } catch (err) {
    isConnected = false;
    console.warn(`⚠️ MySQL Connection note: ${err.message}`);
    console.log('ℹ️ Running in resilient Dual-Mode: Using active high-speed memory store initialized with slide-exact quick commerce data.');
    console.log('ℹ️ Server will auto-connect to MySQL as soon as MySQL service is started.');

    if (!reconnectTimer) {
      reconnectTimer = setInterval(async () => {
        try {
          if (!isConnected && pool) {
            const conn = await pool.getConnection();
            isConnected = true;
            console.log('✅ MySQL Database [quick_commerce_db] is now online & connected!');
            conn.release();
            clearInterval(reconnectTimer);
            reconnectTimer = null;
          }
        } catch (e) {
          // Still waiting for MySQL to start
        }
      }, 5000);
    }
  }
}

// Unified query wrapper
async function query(sql, params = []) {
  if (isConnected && pool) {
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (err) {
      console.error('MySQL query error, checking fallback:', err.message);
      throw err;
    }
  }

  // Graceful Mock Query simulation for instant zero-dependency testing
  return mockQuery(sql, params);
}

function mockQuery(sql, params) {
  const s = sql.trim().toLowerCase();

  if (s.startsWith('select')) {
    if (s.includes('from users')) return memoryStore.users;
    if (s.includes('from vendors')) return memoryStore.vendors;
    if (s.includes('from delivery_boys')) return memoryStore.delivery_boys;
    if (s.includes('from categories')) return memoryStore.categories;
    if (s.includes('from subcategories')) return memoryStore.subcategories || [];
    if (s.includes('from products')) return memoryStore.products;
    if (s.includes('from delivery_charge_slabs')) return memoryStore.delivery_charge_slabs;
    if (s.includes('from orders')) return memoryStore.orders;
    if (s.includes('from coupons')) return memoryStore.coupons;
    if (s.includes('from banners')) return memoryStore.banners;
    if (s.includes('from notifications')) return memoryStore.notifications;
    if (s.includes('from otps')) return memoryStore.otps || [];
    return [];
  }

  return { insertId: Date.now(), affectedRows: 1 };
}

initDB();

module.exports = {
  pool,
  query,
  isConnected: () => isConnected,
  memoryStore
};
