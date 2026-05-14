export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM gifts ORDER BY created_at DESC").all();
    return new Response(JSON.stringify(results));
  }

  if (request.method === "POST") {
    const body = await request.json();
    const { action, phone_number, pin } = body;

    // PIN SETUP
    if (action === 'setup_pin') {
      await env.DB.prepare("UPDATE users SET pin = ? WHERE phone_number = ?").bind(pin, phone_number).run();
      return new Response(JSON.stringify({ success: true }));
    }

    // AUTHENTICATE USER
    if (action === 'login' || action === 'redeem') {
      const user = await env.DB.prepare("SELECT * FROM users WHERE phone_number = ? AND pin = ?").bind(phone_number, pin).first();
      if (!user) return new Response(JSON.stringify({ error: "Invalid Phone or PIN" }), { status: 401 });

      if (action === 'login') return new Response(JSON.stringify({ success: true, points: user.total_points }));

      // GAMIFIED REDEMPTION WITH RARITY WEIGHTS
      if (action === 'redeem') {
        const REDEMPTION_COST = 10;
        if (user.total_points < REDEMPTION_COST) return new Response(JSON.stringify({ error: "Need 10 pts." }), { status: 400 });

        // Select gifts, including their weight
        const { results: gifts } = await env.DB.prepare("SELECT id, name, weight FROM gifts WHERE inventory > 0").all();
        if (!gifts.length) return new Response(JSON.stringify({ error: "No gifts left!" }), { status: 400 });

        // --- NEW WEIGHTED RANDOMNESS ALGORITHM ---
        let totalWeight = gifts.reduce((sum, gift) => sum + gift.weight, 0);
        let randomNum = Math.floor(Math.random() * totalWeight);
        
        let wonGift = gifts[0];
        for (let gift of gifts) {
          if (randomNum < gift.weight) {
            wonGift = gift;
            break;
          }
          randomNum -= gift.weight; // Subtract and move to the next item
        }
        // -----------------------------------------

        await env.DB.prepare("INSERT INTO redemptions (id, phone_number, points_spent, reward_won) VALUES (?, ?, ?, ?)")
          .bind(crypto.randomUUID(), phone_number, REDEMPTION_COST, wonGift.name).run();
        await env.DB.prepare("UPDATE users SET total_points = total_points - ? WHERE phone_number = ?").bind(REDEMPTION_COST, phone_number).run();
        
        // Decrease inventory only if it is a real physical gift (Try Again usually doesn't matter, but it's safe to decrement)
        await env.DB.prepare("UPDATE gifts SET inventory = inventory - 1 WHERE id = ?").bind(wonGift.id).run();

        return new Response(JSON.stringify({ success: true, reward_won: wonGift.name, remaining_points: user.total_points - REDEMPTION_COST }));
      }
    }

    // ADMIN: ADD GIFT (Now includes Weight)
    if (action === 'add_gift') {
      const weight = body.weight ? Number(body.weight) : 10; // Default to 10 if not provided
      await env.DB.prepare("INSERT INTO gifts (id, name, inventory, weight) VALUES (?, ?, ?, ?)")
        .bind(crypto.randomUUID(), body.name, body.inventory, weight).run();
      return new Response(JSON.stringify({ success: true }));
    }
  }
}
