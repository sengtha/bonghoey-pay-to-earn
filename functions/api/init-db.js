export async function onRequestGet(context) {
  const { env } = context;

  try {
    // Execute all table creation and initial data insertion at once
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS users (
        phone_number TEXT PRIMARY KEY,
        total_points INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        phone_number TEXT,
        amount_khr REAL,
        points_earned INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS redemptions (
        id TEXT PRIMARY KEY,
        phone_number TEXT,
        points_spent INTEGER,
        reward_won TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS gifts (
        id TEXT PRIMARY KEY,
        name TEXT,
        inventory INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Insert starter physical gifts. 'Try Again' gets massive inventory.
      INSERT OR IGNORE INTO gifts (id, name, inventory) VALUES 
      ('gift_1', 'កាហ្វេទឹកដោះគោទឹកកក (Iced Coffee)', 50),
      ('gift_2', 'អាវយឺត (T-Shirt)', 10),
      ('gift_3', 'ប័ណ្ណបញ្ចុះតម្លៃ ១០% (10% Discount Coupon)', 100),
      ('gift_4', 'សូមព្យាយាមម្តងទៀត (Try Again - No Prize)', 999999);
    `);

    return new Response("✅ Database tables and starter gifts created successfully!", { status: 200 });
  } catch (error) {
    return new Response("❌ Error initializing DB: " + error.message, { status: 500 });
  }
}
