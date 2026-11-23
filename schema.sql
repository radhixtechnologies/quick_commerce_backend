-- ============================================================================
-- QUICK COMMERCE MULTI-VENDOR PLATFORM - COMPLETE DATABASE SCHEMA
-- Target Engine: MySQL 8.0+
-- Fully Normalized, Foreign Keys, Indexes & Default Seed Data
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `quick_commerce_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `quick_commerce_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. USERS & ROLES
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `phone` VARCHAR(20) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('customer', 'vendor', 'delivery_boy', 'admin', 'super_admin') NOT NULL DEFAULT 'customer',
  `avatar` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('active', 'inactive', 'blocked') NOT NULL DEFAULT 'active',
  `fcm_token` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_status` (`status`),
  INDEX `idx_users_phone` (`phone`)
) ENGINE=InnoDB;

-- 2. CUSTOMER ADDRESSES
DROP TABLE IF EXISTS `customer_addresses`;
CREATE TABLE `customer_addresses` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `type` ENUM('Home', 'Work', 'Other') NOT NULL DEFAULT 'Home',
  `address_line1` VARCHAR(255) NOT NULL,
  `address_line2` VARCHAR(255) DEFAULT NULL,
  `landmark` VARCHAR(150) DEFAULT NULL,
  `city` VARCHAR(100) NOT NULL DEFAULT 'Noida',
  `state` VARCHAR(100) NOT NULL DEFAULT 'Uttar Pradesh',
  `pincode` VARCHAR(20) NOT NULL,
  `latitude` DECIMAL(10, 8) NOT NULL,
  `longitude` DECIMAL(11, 8) NOT NULL,
  `is_default` BOOLEAN NOT NULL DEFAULT FALSE,
  `delivery_instructions` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_cust_addr_coords` (`latitude`, `longitude`)
) ENGINE=InnoDB;

-- 2.1 OTP VERIFICATIONS (Conditional for Service-Based Vendors)
DROP TABLE IF EXISTS `otps`;
CREATE TABLE `otps` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `phone` VARCHAR(20) NOT NULL,
  `otp` VARCHAR(10) NOT NULL,
  `is_verified` BOOLEAN NOT NULL DEFAULT FALSE,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_otps_phone` (`phone`)
) ENGINE=InnoDB;

-- 3. VENDORS (Business & Settlement Details)
DROP TABLE IF EXISTS `vendors`;
CREATE TABLE `vendors` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `business_name` VARCHAR(180) NOT NULL,
  `legal_name` VARCHAR(180) DEFAULT NULL,
  `business_type` ENUM('food', 'ecommerce', 'services', 'service_based', 'grocery', 'restaurant', 'bakery_cake', 'local_shop') NOT NULL DEFAULT 'grocery',
  `vendor_category` ENUM('food', 'ecommerce', 'service_based', 'grocery') NOT NULL DEFAULT 'grocery',
  `is_otp_verified` BOOLEAN NOT NULL DEFAULT FALSE,
  `documents_json` JSON DEFAULT NULL,
  `document_verification_json` JSON DEFAULT NULL,
  `bank_details_json` JSON DEFAULT NULL,
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `logo_url` VARCHAR(255) DEFAULT NULL,
  `cover_image_url` VARCHAR(255) DEFAULT NULL,
  `address` VARCHAR(255) NOT NULL,
  `city` VARCHAR(100) NOT NULL DEFAULT 'Noida',
  `state` VARCHAR(100) NOT NULL DEFAULT 'Uttar Pradesh',
  `pincode` VARCHAR(20) NOT NULL,
  `latitude` DECIMAL(10, 8) NOT NULL,
  `longitude` DECIMAL(11, 8) NOT NULL,
  `service_radius_km` DECIMAL(5, 2) NOT NULL DEFAULT 8.00,
  `opening_time` TIME NOT NULL DEFAULT '07:00:00',
  `closing_time` TIME NOT NULL DEFAULT '23:00:00',
  `is_open` BOOLEAN NOT NULL DEFAULT TRUE,
  `commission_rate` DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
  `min_order_amount` DECIMAL(10, 2) NOT NULL DEFAULT 99.00,
  `approval_status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `rejection_reason` TEXT DEFAULT NULL,
  `pan_number` VARCHAR(30) DEFAULT NULL,
  `gst_number` VARCHAR(30) DEFAULT NULL,
  `kyc_doc_type` VARCHAR(50) DEFAULT 'FSSAI License',
  `kyc_doc_url` VARCHAR(255) DEFAULT NULL,
  `bank_name` VARCHAR(100) DEFAULT NULL,
  `bank_account_no` VARCHAR(50) DEFAULT NULL,
  `bank_ifsc` VARCHAR(30) DEFAULT NULL,
  `bank_account_holder` VARCHAR(120) DEFAULT NULL,
  `rating` DECIMAL(3, 2) NOT NULL DEFAULT 4.80,
  `total_reviews` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_orders` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_featured` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_vendors_location` (`latitude`, `longitude`),
  INDEX `idx_vendors_status` (`approval_status`, `is_open`)
) ENGINE=InnoDB;

-- 4. DELIVERY BOYS (Riders)
DROP TABLE IF EXISTS `delivery_boys`;
CREATE TABLE `delivery_boys` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `full_name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `vehicle_type` ENUM('bike', 'scooter', 'cycle', 'ev') NOT NULL DEFAULT 'bike',
  `vehicle_number` VARCHAR(50) DEFAULT NULL,
  `driving_license_no` VARCHAR(50) DEFAULT NULL,
  `license_doc_url` VARCHAR(255) DEFAULT NULL,
  `aadhaar_no` VARCHAR(50) DEFAULT NULL,
  `aadhaar_doc_url` VARCHAR(255) DEFAULT NULL,
  `approval_status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `rejection_reason` TEXT DEFAULT NULL,
  `is_online` BOOLEAN NOT NULL DEFAULT FALSE,
  `current_latitude` DECIMAL(10, 8) DEFAULT NULL,
  `current_longitude` DECIMAL(11, 8) DEFAULT NULL,
  `last_location_updated_at` TIMESTAMP NULL DEFAULT NULL,
  `active_order_id` INT UNSIGNED DEFAULT NULL,
  `rating` DECIMAL(3, 2) NOT NULL DEFAULT 4.90,
  `total_deliveries` INT UNSIGNED NOT NULL DEFAULT 0,
  `wallet_balance` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `total_cod_collected` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `bank_name` VARCHAR(100) DEFAULT NULL,
  `bank_account_no` VARCHAR(50) DEFAULT NULL,
  `bank_ifsc` VARCHAR(30) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_delivery_boys_online_loc` (`is_online`, `current_latitude`, `current_longitude`),
  INDEX `idx_delivery_boys_approval` (`approval_status`)
) ENGINE=InnoDB;

-- 5. CATEGORIES & SUBCATEGORIES
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(120) NOT NULL UNIQUE,
  `module_type` ENUM('food', 'ecommerce', 'services', 'grocery', 'restaurant', 'bakery_cake', 'local_shop') NOT NULL DEFAULT 'grocery',
  `description` TEXT DEFAULT NULL,
  `icon_url` VARCHAR(255) DEFAULT NULL,
  `image_url` VARCHAR(255) DEFAULT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `commission_rate` DECIMAL(5, 2) DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_category_module` (`module_type`, `is_active`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `subcategories`;
CREATE TABLE `subcategories` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(120) NOT NULL,
  `icon_url` VARCHAR(255) DEFAULT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE,
  INDEX `idx_subcat_category` (`category_id`, `is_active`)
) ENGINE=InnoDB;

-- 6. PRODUCTS & MENU ITEMS
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `vendor_id` INT UNSIGNED NOT NULL,
  `category_id` INT UNSIGNED NOT NULL,
  `subcategory_id` INT UNSIGNED DEFAULT NULL,
  `name` VARCHAR(200) NOT NULL,
  `slug` VARCHAR(220) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `discount_price` DECIMAL(10, 2) DEFAULT NULL,
  `stock` INT NOT NULL DEFAULT 100,
  `unit` VARCHAR(50) NOT NULL DEFAULT 'piece',
  `image_url` VARCHAR(255) DEFAULT NULL,
  `raw_image_url` VARCHAR(255) DEFAULT NULL,
  `ai_generated_image_url` VARCHAR(255) DEFAULT NULL,
  `ai_generated_video_url` VARCHAR(255) DEFAULT NULL,
  `gallery_images` JSON DEFAULT NULL,
  `variations` JSON DEFAULT NULL,
  `addons` JSON DEFAULT NULL,
  `food_type` ENUM('veg', 'non_veg', 'egg', 'other') NOT NULL DEFAULT 'veg',
  `is_available` BOOLEAN NOT NULL DEFAULT TRUE,
  `is_featured` BOOLEAN NOT NULL DEFAULT FALSE,
  `approval_status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
  `rejection_reason` TEXT DEFAULT NULL,
  `rating` DECIMAL(3, 2) NOT NULL DEFAULT 4.70,
  `total_reviews` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories`(`id`) ON DELETE SET NULL,
  INDEX `idx_prod_vendor` (`vendor_id`),
  INDEX `idx_prod_category` (`category_id`, `subcategory_id`),
  INDEX `idx_prod_featured` (`is_featured`, `is_available`)
) ENGINE=InnoDB;

-- 7. CART & CART ITEMS
DROP TABLE IF EXISTS `cart_items`;
CREATE TABLE `cart_items` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `vendor_id` INT UNSIGNED NOT NULL,
  `quantity` INT UNSIGNED NOT NULL DEFAULT 1,
  `selected_variation` JSON DEFAULT NULL,
  `selected_addons` JSON DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE CASCADE,
  INDEX `idx_cart_user` (`user_id`)
) ENGINE=InnoDB;

-- 8. COUPONS & OFFERS
DROP TABLE IF EXISTS `coupons`;
CREATE TABLE `coupons` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `title` VARCHAR(150) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `discount_type` ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
  `discount_value` DECIMAL(10, 2) NOT NULL,
  `min_order_amount` DECIMAL(10, 2) NOT NULL DEFAULT 199.00,
  `max_discount_amount` DECIMAL(10, 2) DEFAULT 100.00,
  `usage_limit_total` INT UNSIGNED NOT NULL DEFAULT 1000,
  `usage_limit_per_user` INT UNSIGNED NOT NULL DEFAULT 1,
  `used_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `valid_from` DATETIME NOT NULL,
  `valid_until` DATETIME NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `vendor_id` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE SET NULL,
  INDEX `idx_coupon_code` (`code`, `is_active`)
) ENGINE=InnoDB;

-- 9. DYNAMIC LOCATION & DELIVERY RULES ENGINE
DROP TABLE IF EXISTS `delivery_charge_slabs`;
CREATE TABLE `delivery_charge_slabs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `min_distance_km` DECIMAL(5, 2) NOT NULL,
  `max_distance_km` DECIMAL(5, 2) NOT NULL,
  `charge` DECIMAL(10, 2) NOT NULL,
  `is_available` BOOLEAN NOT NULL DEFAULT TRUE,
  `title` VARCHAR(100) DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_slab_dist` (`min_distance_km`, `max_distance_km`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `delivery_zones`;
CREATE TABLE `delivery_zones` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `zone_type` ENUM('radius', 'pincode', 'polygon') NOT NULL DEFAULT 'pincode',
  `pincodes` JSON DEFAULT NULL,
  `center_latitude` DECIMAL(10, 8) DEFAULT NULL,
  `center_longitude` DECIMAL(11, 8) DEFAULT NULL,
  `radius_km` DECIMAL(5, 2) DEFAULT 10.00,
  `extra_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 10. ORDERS
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_code` VARCHAR(50) NOT NULL UNIQUE,
  `customer_id` INT UNSIGNED NOT NULL,
  `vendor_id` INT UNSIGNED NOT NULL,
  `delivery_boy_id` INT UNSIGNED DEFAULT NULL,
  `address_id` INT UNSIGNED DEFAULT NULL,
  `delivery_address_json` JSON NOT NULL,
  `customer_lat` DECIMAL(10, 8) NOT NULL,
  `customer_lng` DECIMAL(11, 8) NOT NULL,
  `vendor_lat` DECIMAL(10, 8) NOT NULL,
  `vendor_lng` DECIMAL(11, 8) NOT NULL,
  `distance_km` DECIMAL(5, 2) NOT NULL DEFAULT 2.50,
  `subtotal` DECIMAL(10, 2) NOT NULL,
  `discount_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `coupon_code` VARCHAR(50) DEFAULT NULL,
  `delivery_charge` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `platform_fee` DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
  `total_amount` DECIMAL(10, 2) NOT NULL,
  `vendor_earnings` DECIMAL(10, 2) NOT NULL,
  `platform_commission` DECIMAL(10, 2) NOT NULL,
  `delivery_boy_earnings` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `payment_method` ENUM('COD', 'UPI', 'CARD', 'NET_BANKING', 'WALLET') NOT NULL DEFAULT 'COD',
  `payment_status` ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  `order_status` ENUM(
    'placed',
    'accepted',
    'preparing',
    'ready_for_pickup',
    'assigned',
    'picked_up',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'failed',
    'refunded'
  ) NOT NULL DEFAULT 'placed',
  `cancellation_reason` TEXT DEFAULT NULL,
  `cancelled_by` ENUM('customer', 'vendor', 'admin', 'system') DEFAULT NULL,
  `rejection_reason` TEXT DEFAULT NULL,
  `delivery_otp` VARCHAR(6) NOT NULL DEFAULT '1234',
  `proof_of_delivery_url` VARCHAR(255) DEFAULT NULL,
  `estimated_delivery_time` VARCHAR(50) NOT NULL DEFAULT '15-20 mins',
  `placed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `accepted_at` TIMESTAMP NULL DEFAULT NULL,
  `preparing_at` TIMESTAMP NULL DEFAULT NULL,
  `ready_at` TIMESTAMP NULL DEFAULT NULL,
  `assigned_at` TIMESTAMP NULL DEFAULT NULL,
  `picked_up_at` TIMESTAMP NULL DEFAULT NULL,
  `delivered_at` TIMESTAMP NULL DEFAULT NULL,
  `cancelled_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`),
  FOREIGN KEY (`delivery_boy_id`) REFERENCES `delivery_boys`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`address_id`) REFERENCES `customer_addresses`(`id`) ON DELETE SET NULL,
  INDEX `idx_order_status` (`order_status`),
  INDEX `idx_order_customer` (`customer_id`),
  INDEX `idx_order_vendor` (`vendor_id`),
  INDEX `idx_order_delivery_boy` (`delivery_boy_id`),
  INDEX `idx_order_code` (`order_code`)
) ENGINE=InnoDB;

-- 11. ORDER ITEMS
DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `product_name` VARCHAR(200) NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `quantity` INT UNSIGNED NOT NULL DEFAULT 1,
  `subtotal` DECIMAL(10, 2) NOT NULL,
  `selected_variation` JSON DEFAULT NULL,
  `selected_addons` JSON DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`),
  INDEX `idx_order_items_order` (`order_id`)
) ENGINE=InnoDB;

-- 12. ORDER STATUS TIMELINE LOGS
DROP TABLE IF EXISTS `order_status_logs`;
CREATE TABLE `order_status_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT UNSIGNED NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_by_user_id` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  INDEX `idx_timeline_order` (`order_id`)
) ENGINE=InnoDB;

-- 13. PAYMENTS & TRANSACTIONS
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT UNSIGNED NOT NULL,
  `transaction_id` VARCHAR(100) NOT NULL UNIQUE,
  `payment_method` ENUM('COD', 'UPI', 'CARD', 'NET_BANKING', 'WALLET') NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `status` ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  `gateway_response` JSON DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  INDEX `idx_payment_status` (`status`)
) ENGINE=InnoDB;

-- 14. COD COLLECTIONS
DROP TABLE IF EXISTS `cod_collections`;
CREATE TABLE `cod_collections` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `delivery_boy_id` INT UNSIGNED NOT NULL,
  `order_id` INT UNSIGNED NOT NULL,
  `amount_collected` DECIMAL(10, 2) NOT NULL,
  `deposit_status` ENUM('pending', 'deposited', 'verified') NOT NULL DEFAULT 'pending',
  `verified_by_admin_id` INT UNSIGNED DEFAULT NULL,
  `deposit_date` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`delivery_boy_id`) REFERENCES `delivery_boys`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  INDEX `idx_cod_boy_status` (`delivery_boy_id`, `deposit_status`)
) ENGINE=InnoDB;

-- 15. VENDOR SETTLEMENTS & DELIVERY BOY SETTLEMENTS
DROP TABLE IF EXISTS `vendor_settlements`;
CREATE TABLE `vendor_settlements` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `vendor_id` INT UNSIGNED NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `settlement_date` DATE NOT NULL,
  `status` ENUM('pending', 'processed', 'failed') NOT NULL DEFAULT 'pending',
  `reference_id` VARCHAR(100) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE CASCADE,
  INDEX `idx_vend_settle` (`vendor_id`, `status`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `delivery_boy_settlements`;
CREATE TABLE `delivery_boy_settlements` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `delivery_boy_id` INT UNSIGNED NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `cod_deduction` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `net_payout` DECIMAL(10, 2) NOT NULL,
  `settlement_date` DATE NOT NULL,
  `status` ENUM('pending', 'processed', 'failed') NOT NULL DEFAULT 'pending',
  `reference_id` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`delivery_boy_id`) REFERENCES `delivery_boys`(`id`) ON DELETE CASCADE,
  INDEX `idx_boy_settle` (`delivery_boy_id`, `status`)
) ENGINE=InnoDB;

-- 16. COMMISSION HISTORY
DROP TABLE IF EXISTS `commission_history`;
CREATE TABLE `commission_history` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT UNSIGNED NOT NULL,
  `vendor_id` INT UNSIGNED NOT NULL,
  `order_amount` DECIMAL(10, 2) NOT NULL,
  `commission_rate` DECIMAL(5, 2) NOT NULL,
  `commission_amount` DECIMAL(10, 2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 17. WISHLISTS
DROP TABLE IF EXISTS `wishlists`;
CREATE TABLE `wishlists` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_user_product_wishlist` (`user_id`, `product_id`)
) ENGINE=InnoDB;

-- 18. REVIEWS & RATINGS
DROP TABLE IF EXISTS `reviews`;
CREATE TABLE `reviews` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `vendor_id` INT UNSIGNED DEFAULT NULL,
  `product_id` INT UNSIGNED DEFAULT NULL,
  `order_id` INT UNSIGNED DEFAULT NULL,
  `rating` TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `comment` TEXT DEFAULT NULL,
  `status` ENUM('pending', 'approved', 'hidden') NOT NULL DEFAULT 'approved',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 19. SUPPORT TICKETS / COMPLAINTS
DROP TABLE IF EXISTS `support_tickets`;
CREATE TABLE `support_tickets` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ticket_no` VARCHAR(50) NOT NULL UNIQUE,
  `user_id` INT UNSIGNED NOT NULL,
  `order_id` INT UNSIGNED DEFAULT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `category` VARCHAR(100) NOT NULL DEFAULT 'Order Issue',
  `status` ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  `priority` ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 20. CATEGORIZED NOTIFICATIONS
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `recipient_role` ENUM('all', 'customer', 'vendor', 'delivery_boy', 'admin') NOT NULL DEFAULT 'all',
  `category` ENUM('Orders', 'Offers', 'General') NOT NULL DEFAULT 'General',
  `title` VARCHAR(200) NOT NULL,
  `body` TEXT NOT NULL,
  `data` JSON DEFAULT NULL,
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_notif_user` (`user_id`, `is_read`),
  INDEX `idx_notif_role` (`recipient_role`, `category`)
) ENGINE=InnoDB;

-- 21. PROMOTIONAL BANNERS
DROP TABLE IF EXISTS `banners`;
CREATE TABLE `banners` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(150) NOT NULL,
  `banner_type` ENUM('home', 'promotional', 'offer', 'category') NOT NULL DEFAULT 'home',
  `image_url` VARCHAR(255) NOT NULL,
  `link_type` VARCHAR(50) DEFAULT 'category',
  `link_id` VARCHAR(100) DEFAULT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 22. CMS / STATIC PAGES
DROP TABLE IF EXISTS `cms_pages`;
CREATE TABLE `cms_pages` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `title` VARCHAR(200) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 23. ADMIN SETTINGS
DROP TABLE IF EXISTS `admin_settings`;
CREATE TABLE `admin_settings` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` LONGTEXT NOT NULL,
  `setting_group` ENUM('general', 'app', 'payment', 'tax', 'delivery', 'commission', 'notification', 'service_area', 'minimum_order', 'business') NOT NULL DEFAULT 'general',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================================
-- DEFAULT SEED DATA (Ready for Immediate Testing & Slide-Accurate Metrics)
-- Password for all default accounts is: admin123 (bcrypt hash below)
-- $2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW
-- ============================================================================

-- Users
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password_hash`, `role`, `status`) VALUES
(1, 'Super Administrator', 'superadmin@quickcommerce.com', '+919999900001', '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW', 'super_admin', 'active'),
(2, 'Operations Admin', 'admin@quickcommerce.com', '+919999900002', '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW', 'admin', 'active'),
(3, 'Spice Hub Owner', 'vendor1@spicehub.com', '+919999900003', '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW', 'vendor', 'active'),
(4, 'Fresh Mart Grocery', 'vendor2@freshmart.com', '+919999900004', '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW', 'vendor', 'active'),
(5, 'Daily Needs Mart', 'vendor3@dailyneeds.com', '+919999900005', '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW', 'vendor', 'active'),
(6, 'Sweet Delights Bakery', 'vendor4@sweetdelights.com', '+919999900006', '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW', 'vendor', 'active'),
(7, 'Rahul Khan', 'rider1@quickcommerce.com', '+919999900007', '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW', 'delivery_boy', 'active'),
(8, 'Amit Sharma', 'rider2@quickcommerce.com', '+919999900008', '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW', 'delivery_boy', 'active'),
(9, 'Vikram Yadav', 'rider3@quickcommerce.com', '+919999900009', '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW', 'delivery_boy', 'active'),
(10, 'Neha Verma', 'customer1@gmail.com', '+919999900010', '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW', 'customer', 'active'),
(11, 'Pooja Singh', 'customer2@gmail.com', '+919999900011', '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW', 'customer', 'active');

-- Vendors
INSERT INTO `vendors` (`id`, `user_id`, `business_name`, `business_type`, `email`, `phone`, `address`, `city`, `state`, `pincode`, `latitude`, `longitude`, `service_radius_km`, `opening_time`, `closing_time`, `is_open`, `commission_rate`, `min_order_amount`, `approval_status`, `rating`, `total_reviews`, `total_orders`, `is_featured`) VALUES
(1, 3, 'Spice Hub', 'restaurant', 'vendor1@spicehub.com', '+919999900003', 'Shop 12, Sector 62 Market', 'Noida', 'Uttar Pradesh', '201301', 28.62800000, 77.36490000, 8.00, '10:00:00', '23:00:00', 1, 15.00, 149.00, 'approved', 4.90, 320, 1245, 1),
(2, 4, 'Fresh Mart', 'grocery', 'vendor2@freshmart.com', '+919999900004', 'Block B, Sector 62', 'Noida', 'Uttar Pradesh', '201301', 28.62950000, 77.36700000, 10.00, '06:30:00', '23:30:00', 1, 12.00, 99.00, 'approved', 4.85, 290, 980, 1),
(3, 5, 'Daily Needs', 'local_shop', 'vendor3@dailyneeds.com', '+919999900005', 'Main High Street, Sector 63', 'Noida', 'Uttar Pradesh', '201307', 28.63100000, 77.37100000, 7.00, '07:00:00', '22:00:00', 1, 10.00, 79.00, 'approved', 4.75, 150, 876, 0),
(4, 6, 'Sweet Delights Bakery', 'bakery_cake', 'vendor4@sweetdelights.com', '+919999900006', 'Plot 4, Sector 62 Metro Hub', 'Noida', 'Uttar Pradesh', '201301', 28.62720000, 77.36250000, 9.00, '08:00:00', '23:00:00', 1, 14.00, 199.00, 'approved', 4.92, 410, 654, 1);

-- Delivery Boys
INSERT INTO `delivery_boys` (`id`, `user_id`, `full_name`, `phone`, `email`, `vehicle_type`, `vehicle_number`, `approval_status`, `is_online`, `current_latitude`, `current_longitude`, `rating`, `total_deliveries`, `wallet_balance`, `total_cod_collected`) VALUES
(1, 7, 'Rahul Khan', '+919999900007', 'rider1@quickcommerce.com', 'bike', 'UP16-AB-1234', 'approved', 1, 28.62850000, 77.36550000, 4.95, 412, 1450.00, 680.00),
(2, 8, 'Amit Sharma', '+919999900008', 'rider2@quickcommerce.com', 'scooter', 'UP16-CD-5678', 'approved', 1, 28.62900000, 77.36620000, 4.88, 385, 1220.00, 450.00),
(3, 9, 'Vikram Yadav', '+919999900009', 'rider3@quickcommerce.com', 'ev', 'UP16-EV-9012', 'approved', 1, 28.63000000, 77.36800000, 4.90, 290, 980.00, 0.00);

-- Customer Addresses
INSERT INTO `customer_addresses` (`id`, `user_id`, `type`, `address_line1`, `address_line2`, `landmark`, `city`, `state`, `pincode`, `latitude`, `longitude`, `is_default`, `delivery_instructions`) VALUES
(1, 10, 'Home', 'H-12, Green Park', 'Sector 62', 'Near Fortis Hospital', 'Noida', 'Uttar Pradesh', '201301', 28.62500000, 77.36100000, 1, 'Leave at door and ring bell once.'),
(2, 10, 'Work', 'Office Tower 4, Sector 62', 'IT Park', 'Opposite Metro Station', 'Noida', 'Uttar Pradesh', '201301', 28.62750000, 77.36300000, 0, 'Call upon arrival at reception.'),
(3, 11, 'Home', 'Flat 302, Royal Residency', 'Sector 62', 'Behind City Mall', 'Noida', 'Uttar Pradesh', '201301', 28.62650000, 77.36450000, 1, 'Deliver to guard if not responding.');

-- Categories (4 Verticals: Food, Ecommerce, Services, Grocery)
INSERT INTO `categories` (`id`, `name`, `slug`, `module_type`, `description`, `icon_url`, `image_url`, `is_active`, `sort_order`) VALUES
-- Grocery
(1, 'Fruits & Vegetables', 'fruits-vegetables', 'grocery', 'Fresh farm handpicked vegetables & organic fruits', '🥦', '/images/categories/veg_banner.png', 1, 1),
(2, 'Dairy, Bread & Eggs', 'dairy-bread-eggs', 'grocery', 'Fresh farm milk, paneer, curd, butter and farm eggs', '🥛', '/images/categories/dairy_banner.png', 1, 2),
(3, 'Snacks & Munchies', 'snacks-munchies', 'grocery', 'Chips, namkeen, dry fruits, cookies & biscuits', '🍟', '/images/categories/snacks_banner.png', 1, 3),
(4, 'Cold Drinks & Juices', 'cold-drinks-juices', 'grocery', 'Soft drinks, energy drinks, juices & flavored milk', '🥤', '/images/categories/drinks_banner.png', 1, 4),
-- Food
(5, 'North Indian & Thalis', 'north-indian-thalis', 'food', 'Freshly prepared north indian, paneer curries, dals & thalis', '🍛', '/images/categories/food_banner.png', 1, 5),
(6, 'Biryani & Rice Dishes', 'biryani-rice-dishes', 'food', 'Dum cooked hyderabadi, lucknowi & kolkata biryanis', '🍲', '/images/categories/biryani_banner.png', 1, 6),
(7, 'Pizza, Burgers & Fast Food', 'pizza-burgers-fast-food', 'food', 'Wood-fired pizzas, gourmet burgers, wraps & crispy fries', '🍕', '/images/categories/pizza_banner.png', 1, 7),
(8, 'Bakery, Desserts & Cakes', 'bakery-desserts-cakes', 'food', 'Artisan cakes, pastries, sourdough bread and cookies', '🎂', '/images/categories/bakery_banner.png', 1, 8),
-- E-commerce
(9, 'Fashion & Apparel', 'fashion-apparel', 'ecommerce', 'Men, women & kids fashion, t-shirts, jeans & accessories', '👕', '/images/categories/fashion_banner.png', 1, 9),
(10, 'Electronics & Gadgets', 'electronics-gadgets', 'ecommerce', 'Smartphones, earbuds, power banks & mobile accessories', '📱', '/images/categories/gadgets_banner.png', 1, 10),
(11, 'Home, Kitchen & Decor', 'home-kitchen-decor', 'ecommerce', 'Cookware, organizer boxes, bedsheets & LED lamps', '🏠', '/images/categories/home_banner.png', 1, 11),
(12, 'Beauty & Personal Care', 'beauty-personal-care', 'ecommerce', 'Skincare serums, cosmetics, perfumes & haircare', '💄', '/images/categories/beauty_banner.png', 1, 12),
-- Service Based (Urban Company style)
(13, 'Home Cleaning & Pest Control', 'home-cleaning-pest-control', 'services', 'Deep bathroom cleaning, full home sanitization & sofa shampooing', '🧹', '/images/categories/cleaning_banner.png', 1, 13),
(14, 'AC & Appliance Repair', 'ac-appliance-repair', 'services', 'AC servicing & gas refill, washing machine & microwave repair', '❄️', '/images/categories/ac_repair_banner.png', 1, 14),
(15, 'Electrician, Plumber & Carpenter', 'electrician-plumber-carpenter', 'services', 'Fan installation, tap repair, drill & hang, door lock fixes', '🔧', '/images/categories/handyman_banner.png', 1, 15),
(16, 'Salon & Spa for Women/Men', 'salon-spa', 'services', 'Facial, waxing, manicure, pedicure & professional massage at home', '💆', '/images/categories/salon_banner.png', 1, 16);

-- Subcategories (Mapped to 4 Verticals)
INSERT INTO `subcategories` (`id`, `category_id`, `name`, `slug`, `icon_url`, `is_active`, `sort_order`) VALUES
-- Grocery Subcategories
(1, 1, 'Fresh Vegetables', 'fresh-vegetables', '🥕', 1, 1),
(2, 1, 'Fresh Fruits', 'fresh-fruits', '🍎', 1, 2),
(3, 1, 'Exotic & Organic Herbs', 'exotic-organic-herbs', '🌿', 1, 3),
(4, 2, 'Milk & Cream', 'milk-cream', '🥛', 1, 1),
(5, 2, 'Paneer & Tofu', 'paneer-tofu', '🧀', 1, 2),
(6, 2, 'Farm Fresh Eggs', 'farm-fresh-eggs', '🥚', 1, 3),
(7, 2, 'Butter, Curd & Yogurt', 'butter-curd-yogurt', '🧈', 1, 4),
(8, 3, 'Potato Chips & Crisps', 'chips-crisps', '🥔', 1, 1),
(9, 3, 'Namkeen & Mixtures', 'namkeen-mixtures', '🍿', 1, 2),
(10, 3, 'Biscuits & Cookies', 'biscuits-cookies', '🍪', 1, 3),
(11, 4, 'Carbonated Soft Drinks', 'carbonated-soft-drinks', '🥤', 1, 1),
(12, 4, 'Fruit Juices & Smoothies', 'fruit-juices-smoothies', '🧃', 1, 2),
(13, 4, 'Energy Drinks & Soda', 'energy-drinks-soda', '⚡', 1, 3),
-- Food Subcategories
(14, 5, 'Paneer Curries & Gravies', 'paneer-curries', '🍲', 1, 1),
(15, 5, 'Dal Makhani & Tadka', 'dal-makhani-tadka', '🥣', 1, 2),
(16, 5, 'Indian Breads (Naan, Roti)', 'indian-breads', '🫓', 1, 3),
(17, 5, 'Deluxe Executive Thalis', 'deluxe-thalis', '🍱', 1, 4),
(18, 6, 'Hyderabadi Dum Biryani', 'hyderabadi-dum-biryani', '🍗', 1, 1),
(19, 6, 'Veg & Paneer Biryani', 'veg-biryani', '🍚', 1, 2),
(20, 7, 'Cheese Burst Pizzas', 'cheese-burst-pizzas', '🍕', 1, 1),
(21, 7, 'Crispy Fried Burgers', 'crispy-burgers', '🍔', 1, 2),
(22, 7, 'Kathi Rolls & Wraps', 'kathi-rolls-wraps', '🌯', 1, 3),
(23, 8, 'Custom Birthday Cakes', 'birthday-cakes', '🎂', 1, 1),
(24, 8, 'Pastries & Cheesecakes', 'pastries-cheesecakes', '🍰', 1, 2),
-- Ecommerce Subcategories
(25, 9, 'Men T-Shirts & Shirts', 'men-tshirts-shirts', '👔', 1, 1),
(26, 9, 'Women Ethnic & Western Wear', 'women-wear', '👗', 1, 2),
(27, 9, 'Footwear & Sneakers', 'footwear-sneakers', '👟', 1, 3),
(28, 10, 'Smart Watches & Bands', 'smart-watches', '⌚', 1, 1),
(29, 10, 'TWS Earbuds & Headphones', 'earbuds-headphones', '🎧', 1, 2),
(30, 10, 'Fast Chargers & Cables', 'chargers-cables', '🔌', 1, 3),
(31, 11, 'Kitchen Cookware & Bottles', 'kitchen-cookware', '🍳', 1, 1),
(32, 11, 'Storage Organizers & Boxes', 'storage-organizers', '📦', 1, 2),
(33, 12, 'Skincare & Sunscreens', 'skincare-sunscreens', '🧴', 1, 1),
(34, 12, 'Perfumes & Deodorants', 'perfumes-deodorants', '🌸', 1, 2),
-- Service Based (Urban Clap style) Subcategories
(35, 13, 'Bathroom & Kitchen Deep Cleaning', 'deep-cleaning', '✨', 1, 1),
(36, 13, 'Sofa & Carpet Cleaning', 'sofa-carpet-cleaning', '🛋️', 1, 2),
(37, 13, 'Pest Control & Cockroach Spray', 'pest-control', '🐜', 1, 3),
(38, 14, 'AC Foam Jet Servicing', 'ac-servicing', '❄️', 1, 1),
(39, 14, 'AC Gas Refill & Leak Fix', 'ac-gas-refill', '🛠️', 1, 2),
(40, 14, 'Washing Machine Repair', 'washing-machine-repair', '🧺', 1, 3),
(41, 15, 'Fan, Switch & Light Installation', 'electrician-install', '💡', 1, 1),
(42, 15, 'Tap & Pipe Leak Repair', 'plumber-repair', '🚰', 1, 2),
(43, 15, 'Door Lock & Furniture Assembly', 'carpenter-work', '🚪', 1, 3),
(44, 16, 'Salon Classic Facial & Clean-up', 'salon-facial', '💆‍♀️', 1, 1),
(45, 16, 'Manicure & Pedicure at Home', 'manicure-pedicure', '💅', 1, 2),
(46, 16, 'Men Haircut & Beard Grooming', 'men-grooming', '💈', 1, 3);

-- Products
INSERT INTO `products` (`id`, `vendor_id`, `category_id`, `subcategory_id`, `name`, `slug`, `description`, `price`, `discount_price`, `stock`, `unit`, `image_url`, `variations`, `addons`, `food_type`, `is_available`, `is_featured`, `approval_status`, `rating`, `total_reviews`) VALUES
(1, 2, 2, 3, 'Fresh Farm Milk 500ml', 'fresh-farm-milk-500ml', 'Pasteurized full cream cow milk delivered fresh in 15 mins', 35.00, 32.00, 150, 'pack', '/images/products/milk.png', '[{"name":"500ml","price":32},{"name":"1000ml","price":62}]', '[]', 'veg', 1, 1, 'approved', 4.90, 480),
(2, 2, 1, 1, 'Fresh Hybrid Tomatoes', 'fresh-hybrid-tomatoes', 'Juicy, farm fresh ripe red hybrid tomatoes', 45.00, 40.00, 200, '1 kg', '/images/products/tomatoes.png', '[{"name":"500g","price":22},{"name":"1kg","price":40}]', '[]', 'veg', 1, 1, 'approved', 4.80, 210),
(3, 2, 1, 2, 'Robusta Bananas', 'robusta-bananas', 'Naturally sweetened energetic premium bananas', 70.00, 60.00, 120, '1 dozen', '/images/products/banana.png', '[{"name":"6 pcs","price":32},{"name":"12 pcs","price":60}]', '[]', 'veg', 1, 1, 'approved', 4.85, 140),
(4, 2, 3, NULL, 'Premium Basmati Rice', 'premium-basmati-rice', 'Long grain aromatic aged basmati rice', 320.00, 299.00, 80, '1 kg', '/images/products/rice.png', '[{"name":"1kg","price":299},{"name":"5kg","price":1399}]', '[]', 'veg', 1, 1, 'approved', 4.90, 310),
(5, 1, 5, 5, 'Butter Paneer Masala Gravy', 'butter-paneer-masala-gravy', 'Rich cashew and butter gravy with fresh cottage cheese cubes', 280.00, 249.00, 50, 'serving', '/images/products/paneer.png', '[{"name":"Regular","price":249},{"name":"Large","price":349}]', '[{"name":"Extra Butter","price":25},{"name":"Extra Cheese","price":35}]', 'veg', 1, 1, 'approved', 4.92, 520),
(6, 1, 5, 5, 'Tandoori Chicken Tikka Platter', 'tandoori-chicken-tikka-platter', 'Succulent clay oven roasted boneless chicken chunks with mint chutney', 290.00, 249.00, 40, 'plate', '/images/products/chicken.png', '[{"name":"6 Pcs","price":249},{"name":"12 Pcs","price":449}]', '[{"name":"Rumali Roti (2 pcs)","price":40}]', 'non_veg', 1, 1, 'approved', 4.88, 360),
(7, 4, 6, 6, 'Belgian Dark Chocolate Truffle Cake', 'belgian-dark-chocolate-truffle-cake', 'Rich moist dutch cocoa sponge layered with silken dark chocolate ganache', 550.00, 499.00, 25, '500g', '/images/products/cake.png', '[{"name":"500g Eggless","price":499},{"name":"1kg Eggless","price":899}]', '[{"name":"Sparkler Candle","price":30},{"name":"Birthday Tag","price":20}]', 'veg', 1, 1, 'approved', 4.96, 420);

-- Dynamic Location & Delivery Rules Engine (Slide 7 & 8 Example)
INSERT INTO `delivery_charge_slabs` (`id`, `min_distance_km`, `max_distance_km`, `charge`, `is_available`, `title`, `sort_order`) VALUES
(1, 0.00, 3.00, 20.00, 1, '0 - 3 KM (Ultra-fast)', 1),
(2, 3.01, 5.00, 30.00, 1, '3 - 5 KM (Local Hub)', 2),
(3, 5.01, 7.00, 40.00, 1, '5 - 7 KM (City Reach)', 3),
(4, 7.01, 10.00, 50.00, 1, '7 - 10 KM (Extended Area)', 4),
(5, 10.01, 99.00, 0.00, 0, '10 KM+ (Not Available)', 5);

-- Delivery Zones
INSERT INTO `delivery_zones` (`id`, `name`, `zone_type`, `pincodes`, `center_latitude`, `center_longitude`, `radius_km`, `extra_fee`, `is_active`) VALUES
(1, 'Noida Core Zone A', 'pincode', '["201301", "201307", "201309"]', 28.62800000, 77.36490000, 8.00, 0.00, 1),
(2, 'Greater Noida Extension Zone B', 'pincode', '["201009", "201308"]', 28.58000000, 77.43000000, 12.00, 15.00, 1);

-- Coupons
INSERT INTO `coupons` (`id`, `code`, `title`, `description`, `discount_type`, `discount_value`, `min_order_amount`, `max_discount_amount`, `usage_limit_total`, `valid_from`, `valid_until`, `is_active`) VALUES
(1, 'WELCOME50', 'Flat 50% Off First Order', 'Enjoy 50% instant discount up to ₹100 on your first quick commerce order', 'percentage', 50.00, 149.00, 100.00, 5000, '2026-01-01 00:00:00', '2027-12-31 23:59:59', 1),
(2, 'QUICK30', 'Flat ₹30 Instant Cashback', 'Instant ₹30 off on any order above ₹199', 'fixed', 30.00, 199.00, 30.00, 10000, '2026-01-01 00:00:00', '2027-12-31 23:59:59', 1),
(3, 'FREESHIP', 'Free Delivery Above ₹199', 'Zero delivery charge on orders over ₹199', 'percentage', 100.00, 199.00, 50.00, 2000, '2026-01-01 00:00:00', '2027-12-31 23:59:59', 1);

-- Orders (Matching Recent Orders Table in Slides #ORD1256, #ORD1255, #ORD1254, #ORD1253, #ORD1252)
INSERT INTO `orders` (`id`, `order_code`, `customer_id`, `vendor_id`, `delivery_boy_id`, `address_id`, `delivery_address_json`, `customer_lat`, `customer_lng`, `vendor_lat`, `vendor_lng`, `distance_km`, `subtotal`, `discount_amount`, `coupon_code`, `delivery_charge`, `tax_amount`, `platform_fee`, `total_amount`, `vendor_earnings`, `platform_commission`, `delivery_boy_earnings`, `payment_method`, `payment_status`, `order_status`, `delivery_otp`, `estimated_delivery_time`) VALUES
(1, '#ORD1256', 10, 1, 2, 1, '{"address":"H-12, Green Park, Sector 62, Noida","pincode":"201301","type":"Home"}', 28.62500000, 77.36100000, 28.62800000, 77.36490000, 2.10, 498.00, 50.00, 'WELCOME50', 20.00, 25.00, 5.00, 498.00, 395.00, 68.00, 35.00, 'UPI', 'paid', 'preparing', '4521', '12-15 mins'),
(2, '#ORD1255', 10, 2, 1, 1, '{"address":"H-12, Green Park, Sector 62, Noida","pincode":"201301","type":"Home"}', 28.62500000, 77.36100000, 28.62950000, 77.36700000, 3.20, 697.00, 0.00, NULL, 0.00, 32.00, 5.00, 697.00, 590.00, 77.00, 30.00, 'CARD', 'paid', 'out_for_delivery', '8912', '10-12 mins'),
(3, '#ORD1254', 11, 3, 1, 3, '{"address":"Flat 302, Royal Residency, Sector 62, Noida","pincode":"201301","type":"Home"}', 28.62650000, 77.36450000, 28.63100000, 77.37100000, 1.80, 249.00, 30.00, 'QUICK30', 20.00, 12.00, 5.00, 249.00, 205.00, 24.00, 25.00, 'COD', 'paid', 'delivered', '3301', 'Delivered'),
(4, '#ORD1253', 11, 2, NULL, 3, '{"address":"Flat 302, Royal Residency, Sector 62, Noida","pincode":"201301","type":"Home"}', 28.62650000, 77.36450000, 28.62950000, 77.36700000, 2.40, 399.00, 0.00, NULL, 20.00, 20.00, 5.00, 399.00, 335.00, 44.00, 0.00, 'COD', 'failed', 'cancelled', '6741', 'Cancelled'),
(5, '#ORD1252', 10, 1, 3, 1, '{"address":"H-12, Green Park, Sector 62, Noida","pincode":"201301","type":"Home"}', 28.62500000, 77.36100000, 28.62800000, 77.36490000, 2.10, 549.00, 0.00, NULL, 20.00, 27.00, 5.00, 549.00, 440.00, 79.00, 30.00, 'UPI', 'paid', 'preparing', '9045', '15-20 mins');

-- Order Items for Recent Orders
INSERT INTO `order_items` (`order_id`, `product_id`, `product_name`, `price`, `quantity`, `subtotal`, `selected_variation`) VALUES
(1, 5, 'Butter Paneer Masala Gravy', 249.00, 2, 498.00, '{"name":"Regular","price":249}'),
(2, 4, 'Premium Basmati Rice', 299.00, 2, 598.00, '{"name":"1kg","price":299}'),
(2, 1, 'Fresh Farm Milk 500ml', 32.00, 3, 96.00, '{"name":"500ml","price":32}'),
(3, 6, 'Tandoori Chicken Tikka Platter', 249.00, 1, 249.00, '{"name":"6 Pcs","price":249}'),
(4, 2, 'Fresh Hybrid Tomatoes', 40.00, 5, 200.00, '{"name":"1kg","price":40}'),
(4, 3, 'Robusta Bananas', 60.00, 3, 180.00, '{"name":"12 pcs","price":60}'),
(5, 5, 'Butter Paneer Masala Gravy', 249.00, 2, 498.00, '{"name":"Regular","price":249}');

-- Order Status Logs
INSERT INTO `order_status_logs` (`order_id`, `status`, `notes`, `created_by_user_id`) VALUES
(1, 'placed', 'Order placed successfully by customer via UPI', 10),
(1, 'accepted', 'Spice Hub accepted the order and started food prep', 3),
(1, 'preparing', 'Kitchen is currently packaging fresh containers', 3),
(2, 'placed', 'Order placed by customer via Card payment', 10),
(2, 'accepted', 'Fresh Mart confirmed stock availability', 4),
(2, 'ready_for_pickup', 'Items sealed in temperature controlled thermal bags', 4),
(2, 'assigned', 'Assigned to Rider Rahul Khan', NULL),
(2, 'picked_up', 'Rider Rahul Khan picked up items from vendor store', 7),
(2, 'out_for_delivery', 'Rider is on bike heading to Sector 62 Green Park', 7),
(3, 'placed', 'Order placed by customer with Cash on Delivery', 11),
(3, 'accepted', 'Vendor accepted', 5),
(3, 'delivered', 'Order successfully verified and handed over with OTP 3301', 7),
(4, 'placed', 'Customer initiated order', 11),
(4, 'cancelled', 'Cancelled by customer due to delivery address mistake', 11),
(5, 'placed', 'Order placed and paid', 10),
(5, 'accepted', 'Vendor accepted', 3),
(5, 'preparing', 'Items being prepared', 3);

-- Payments
INSERT INTO `payments` (`order_id`, `transaction_id`, `payment_method`, `amount`, `status`) VALUES
(1, 'TXN1256_UPI_9901', 'UPI', 498.00, 'paid'),
(2, 'TXN1255_CRD_8842', 'CARD', 697.00, 'paid'),
(3, 'TXN1254_COD_7713', 'COD', 249.00, 'paid'),
(4, 'TXN1253_COD_6620', 'COD', 399.00, 'failed'),
(5, 'TXN1252_UPI_5519', 'UPI', 549.00, 'paid');

-- COD Collections
INSERT INTO `cod_collections` (`delivery_boy_id`, `order_id`, `amount_collected`, `deposit_status`) VALUES
(1, 3, 249.00, 'deposited');

-- Banners
INSERT INTO `banners` (`title`, `banner_type`, `image_url`, `link_type`, `link_id`, `is_active`, `sort_order`) VALUES
('10-Minute Grocery Delivery Guaranteed!', 'home', '/images/banners/banner1.jpg', 'category', '1', 1, 1),
('Flat 50% Off On Delicious Restaurant Curries', 'promotional', '/images/banners/banner2.jpg', 'category', '5', 1, 2),
('Fresh Morning Bakery Bakes & Birthday Treats', 'offer', '/images/banners/banner3.jpg', 'category', '6', 1, 3);

-- Reviews
INSERT INTO `reviews` (`user_id`, `vendor_id`, `product_id`, `order_id`, `rating`, `comment`, `status`) VALUES
(10, 1, 5, 1, 5, 'Butter paneer was warm and piping fresh! Reached in 13 mins.', 'approved'),
(11, 2, 1, 2, 5, 'Chilled fresh milk in early morning. Superb delivery service.', 'approved'),
(10, 4, 7, NULL, 5, 'The chocolate truffle cake was absolute heaven!', 'approved');

-- Notifications
INSERT INTO `notifications` (`user_id`, `recipient_role`, `category`, `title`, `body`) VALUES
(10, 'customer', 'Orders', 'Order #ORD1256 is Preparing', 'Chef at Spice Hub is cooking your delicious meal!'),
(10, 'customer', 'Offers', 'Midnight Craving Deal!', 'Get flat ₹50 off on bakery and dessert items tonight!'),
(NULL, 'all', 'General', 'Monsoon Delivery Advisory', 'All delivery heroes are equipped with waterproof gear.');

-- CMS Pages
INSERT INTO `cms_pages` (`slug`, `title`, `content`) VALUES
('about-us', 'About Quick Commerce', '<h1>About Us</h1><p>Welcome to our hyper-local Quick Commerce Platform delivering essentials, groceries, restaurant meals, and bakery items to your doorstep in 10 to 30 minutes.</p>'),
('privacy-policy', 'Privacy Policy', '<h1>Privacy Policy</h1><p>We respect your privacy. User coordinates and phone numbers are encrypted and only shared with active delivery riders during order dispatch.</p>'),
('terms-conditions', 'Terms & Conditions', '<h1>Terms and Conditions</h1><p>Deliveries are governed by real-time GPS boundary routing and service area availability.</p>'),
('refund-policy', 'Refund Policy', '<h1>Refund Policy</h1><p>In case of missing, damaged, or cancelled orders, instant refunds are processed to your original payment method or wallet within 2-4 hours.</p>'),
('contact-us', 'Contact Us', '<h1>Contact Us</h1><p>Customer Support Helpline: +91 99999 00000<br/>Email: support@quickcommerce.com</p>'),
('faq', 'Frequently Asked Questions', '<h1>Frequently Asked Questions</h1><p><b>Q: How fast is delivery?</b><br/>A: Our rider fleet delivers within 10 to 30 minutes depending on your distance.</p>'),
('help-support', 'Help & Support', '<h1>Help & Support</h1><p>Live order chat and 24x7 customer ticket resolution is available directly in the app.</p>');

-- Admin Settings
INSERT INTO `admin_settings` (`setting_key`, `setting_value`, `setting_group`) VALUES
('app_name', 'Quick Commerce Multi-Vendor', 'general'),
('app_logo', '/images/logo.png', 'general'),
('support_email', 'support@quickcommerce.com', 'general'),
('support_phone', '+91 99999 00000', 'general'),
('free_delivery_threshold', '299.00', 'delivery'),
('default_delivery_charge', '25.00', 'delivery'),
('max_delivery_radius_km', '10.00', 'delivery'),
('rider_dispatch_countdown_sec', '30', 'delivery'),
('auto_assign_delivery_boy', 'true', 'delivery'),
('default_commission_rate', '15.00', 'commission'),
('category_commission_enabled', 'true', 'commission'),
('platform_fee', '5.00', 'business'),
('tax_percentage', '5.00', 'tax'),
('gst_number', '07AAAAA0000A1Z5', 'tax'),
('min_order_amount', '99.00', 'minimum_order'),
('cod_enabled', 'true', 'payment'),
('online_payment_enabled', 'true', 'payment'),
('razorpay_key_id', 'rzp_test_quickcommerce123', 'payment'),
('razorpay_key_secret', 'secret_key_quickcommerce_abc', 'payment'),
('fcm_server_key', 'AAAA_TEST_FCM_SERVER_KEY', 'notification'),
('sms_gateway_enabled', 'false', 'notification');
