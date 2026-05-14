export async function onRequestGet(context) {
  try {
    // Safely attempt to add the 'weight' column if the table already exists
    try {
      await context.env.DB.exec(`ALTER TABLE gifts ADD COLUMN weight INTEGER DEFAULT 10;`);
    } catch (e) {
      // Column likely already exists, continue silently
    }

    await context.env.DB.exec(`
      CREATE TABLE IF NOT EXISTS users (
        phone_number TEXT PRIMARY KEY,
        pin TEXT,
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
        weight INTEGER DEFAULT 10, -- NEW: Rarity System
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Clear old gifts to cleanly apply the new rarity weights
      DELETE FROM gifts;

      -- Insert gifts with specific Weights
      -- High weight = Common (Easy) | Low weight = Rare (Hard)
      INSERT INTO gifts (id, name, inventory, weight) VALUES 
      ('gift_1', 'សូមព្យាយាមម្តងទៀត (Try Again - No Prize)', 999999, 1000),
      ('gift_2', 'ប័ណ្ណបញ្ចុះតម្លៃ ១០% (10% Discount Coupon)', 100, 100),
      ('gift_3', 'កាហ្វេទឹកដោះគោទឹកកក (Iced Coffee)', 50, 10),
      ('gift_4', 'អាវយឺត (T-Shirt)', 10, 1);
    `);
    
    return new Response("✅ Database updated with Gamification Weights!", { status: 200 });
  } catch (error) {
    return new Response("❌ Error: " + error.message, { status: 500 });
  }
}
