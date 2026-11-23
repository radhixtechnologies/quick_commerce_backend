# Quick Commerce Multi-Vendor Backend & Management Ecosystem

Enterprise-grade Quick Commerce backend and management portals supporting **4 Core Verticals**:
1. 🍔 **Food (Restaurants & Cafes)**
2. 🛍️ **E-Commerce (Shopping & Retail)**
3. 🛠️ **Service-Based (Urban Company Style Doorstep Services)**
4. 🥦 **Grocery (Supermarkets & Daily Essentials)**

---

## 🌟 Architecture & Features

- **Responsive Admin Web Panel (`/admin`)**:
  - Live Analytics & KPIs (Orders, Sales, Commission, Delivery Fleet)
  - Category & Subcategory Master Management
  - Vendor Onboarding & Document Verification (Approve / Reject with remarks)
  - Delivery Hero Dispatch & Order Route Tracking
  - Real-time Socket.IO Order Alerts

- **Vendor Web Panel (`/vendor`)**:
  - Real-time Store Open/Close Status Toggle
  - Product & Menu Management with **Gemini AI Media Studio** (4K Product Photography & 10s Promo Video generation)
  - Order Fulfillment Workflow (Accept, Prepare, Dispatch, Handover)
  - Doorstep Customer OTP Verification for Urban Company style on-demand services
  - Sales, Earnings, and Settlement Breakdown
  - 24/7 AI Partner Workflow Support Chat

- **Dual-Mode Backend**:
  - Auto-connects to MySQL (`quick_commerce_db`)
  - Resilient In-Memory Dual Store fallback if database is offline or restarting

---

## 🌐 Live Production Deployment

- **Primary Cloud Backend**: [https://quick-commerce-backend-a3f7.onrender.com](https://quick-commerce-backend-a3f7.onrender.com)
- **Live Admin Web Panel**: [https://quick-commerce-backend-a3f7.onrender.com/admin/](https://quick-commerce-backend-a3f7.onrender.com/admin/)
- **Live Vendor Web Panel**: [https://quick-commerce-backend-a3f7.onrender.com/vendor/](https://quick-commerce-backend-a3f7.onrender.com/vendor/)
- **Live REST API Base**: [https://quick-commerce-backend-a3f7.onrender.com/api/v1](https://quick-commerce-backend-a3f7.onrender.com/api/v1)

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables (`.env`)
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=quick_commerce_super_secret_jwt_key_2026
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=quick_commerce_db
DB_PORT=3306
```

### 3. Start Server
```bash
npm start
```

### 4. Access Web Panels
- **Portal Launchpad**: [http://localhost:5000/](http://localhost:5000/)
- **Admin Management Panel**: [http://localhost:5000/admin/](http://localhost:5000/admin/)
- **Vendor Portal**: [http://localhost:5000/vendor/](http://localhost:5000/vendor/)
- **REST API Base**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
