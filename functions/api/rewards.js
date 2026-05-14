export async function onRequest(context) {
  const { request, env } = context;

  // SHOP ADMIN: GET ALL GIFTS
  if (request.method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM gifts ORDER BY created_at DESC").all();
    return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
  }

  // POST REQUESTS
  if (request.method === "POST") {
    const body = await request.json();
    const { action, phone_number } = body;

    // SHOP ADMIN: ADD NEW GIFT
    if (action === 'add_gift') {
      const id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO gifts (id, name, inventory) VALUES (?, ?, ?)")
        .bind(id, body.name, body.inventory).run();
      return new Response(JSON.stringify({ success: true }));
    }

    // USER: CHECK BALANCE
    if (action === 'check_balance') {
      if (!phone_number) return new Response(JSON.stringify({ error: "Phone required" }), { status: 400 });
      const user = await env.DB.prepare("SELECT total_points FROM users WHERE phone_number = ?").bind(phone_number).first();
      return new Response(JSON.stringify({ points: user ? user.total_points : 0 }));
    }

    // USER: REDEEM GAMIFICATION
    if (action === 'redeem') {
      const REDEMPTION_COST = 10;
      
      const user = await env.DB.prepare("SELECT total_points FROM users WHERE phone_number = ?").bind(phone_number).first();
      if (!user || user.total_points < REDEMPTION_COST) {
        return new Response(JSON.stringify({ error: "Not enough points. Need 10 pts to play." }), { status: 400 });
      }

      // Fetch available physical gifts
      const { results: availableGifts } = await env.DB.prepare("SELECT id, name FROM gifts WHERE inventory > 0").all();
      if (!availableGifts || availableGifts.length === 0) {
        return new Response(JSON.stringify({ error: "No gifts available right now!" }), { status: 400 });
      }

      // Pseudo-random selection (perfect for free micro-transactions)
      const randomIndex = Math.floor(Math.random() * availableGifts.length);
      const wonGift = availableGifts[randomIndex];

      // Deduct Points and Inventory
      const redeemId = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO redemptions (id, phone_number, points_spent, reward_won) VALUES (?, ?, ?, ?)")
        .bind(redeemId, phone_number, REDEMPTION_COST, wonGift.name).run();

      await env.DB.prepare("UPDATE users SET total_points = total_points - ? WHERE phone_number = ?")
        .bind(REDEMPTION_COST, phone_number).run();

      await env.DB.prepare("UPDATE gifts SET inventory = inventory - 1 WHERE id = ?")
        .bind(wonGift.id).run();

      return new Response(JSON.stringify({ 
        success: true, 
        reward_won: wonGift.name, 
        remaining_points: user.total_points - REDEMPTION_COST 
      }));
    }
  }
}
