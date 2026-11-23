const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'quick_commerce_db';

  console.log('================================================================');
  console.log('📦 Quick Commerce Backend - MySQL Database Setup');
  console.log('================================================================');
  console.log(`Connecting to MySQL at ${host}:${port} as user '${user}'...`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true
    });
    console.log('✅ Connected to MySQL server successfully.');
  } catch (err) {
    console.error('❌ Could not connect to MySQL server:');
    console.error(`   ${err.message}`);
    console.log('\n👉 Important:');
    console.log('   1. Open XAMPP Control Panel (C:\\xampp\\xampp-control.exe)');
    console.log('   2. Click "Start" on MySQL');
    console.log('   3. Re-run: npm run db:setup');
    process.exit(1);
  }

  try {
    const schemaFile = path.join(__dirname, '..', 'schema.sql');
    console.log(`Reading schema from: ${schemaFile}`);
    const schemaSql = fs.readFileSync(schemaFile, 'utf8');

    console.log(`Executing schema.sql on database '${dbName}'...`);
    await connection.query(schemaSql);

    console.log('----------------------------------------------------------------');
    console.log(`🎉 Database [${dbName}] created and seeded successfully!`);
    console.log('   All tables, relationships, and default admin/test data are ready.');
    console.log('----------------------------------------------------------------');
    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error executing schema.sql:', err.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

setupDatabase();
