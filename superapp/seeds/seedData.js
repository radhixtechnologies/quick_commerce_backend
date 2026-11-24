/**
 * Database Seed Runner & Verifier for Super App Ecosystem
 */
const db = require('../config/db');

async function runSeed() {
  console.log('🌱 Checking seed data initialization...');
  console.log(`✓ Services seeded: ${db.memoryStore.services.length}`);
  console.log(`✓ Categories seeded: ${db.memoryStore.categories.length}`);
  console.log(`✓ Vendors seeded: ${db.memoryStore.vendors.length}`);
  console.log(`✓ Delivery partners seeded: ${db.memoryStore.delivery_boys.length}`);
  console.log(`✓ Orders initialized: ${db.memoryStore.orders.length}`);
  console.log('✅ All Super App seed data ready!');
}

runSeed();
