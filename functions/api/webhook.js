export async function onRequestPost(context) {
  const { request, env } = context;

  const signature = request.headers.get("x-bonghoey-signature");
  if (!signature) return new Response("Missing Signature", { status: 401 });

  const rawBody = await request.text();
  const isValid = await verifySignature(env.BONGHOEY_WEBHOOK_SECRET, rawBody, signature);
  if (!isValid) return new Response("Unauthorized", { status: 401 });

  const payload = JSON.parse(rawBody);
  const eventType = payload.event;
  const txId = payload.transaction_id;

  if (!txId) return new Response("Missing transaction_id", { status: 400 });

  // EVENT 1: User Uploads Receipt
  if (eventType === "receipt.paid") {
    const phoneNumber = payload.sender_input; 
    if (!phoneNumber) return new Response("Missing phone", { status: 400 });

    const existingUser = await env.DB.prepare("SELECT phone_number, pin FROM users WHERE phone_number = ?").bind(phoneNumber).first();

    if (!existingUser) {
      await env.DB.prepare("INSERT INTO users (phone_number, total_points) VALUES (?, 0)").bind(phoneNumber).run();
    }

    await env.DB.prepare(`
      INSERT INTO transactions (id, phone_number, amount_khr, points_earned, status) 
      VALUES (?, ?, 0, 0, 'pending') ON CONFLICT(id) DO NOTHING
    `).bind(txId, phoneNumber).run();

    // Magic Link Handoff for BongHoey
    let responsePayload;
    const baseUrl = "https://pay-to-earn.pages.dev"; // UPDATE THIS LATER

    if (!existingUser || !existingUser.pin) {
      const claimToken = crypto.randomUUID(); 
      responsePayload = { action: { url: `${baseUrl}?setup=true&token=${claimToken}&phone=${phoneNumber}`, button_text: "Setup Account & Claim" } };
    } else {
      responsePayload = { action: { url: baseUrl, button_text: "View My Dashboard" } };
    }

    return new Response(JSON.stringify(responsePayload), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  // EVENT 2: Shop Verifies Receipt
  if (eventType === "receipt.verified") {
    const amountKhr = payload.amount;
    if (!amountKhr) return new Response("Missing amount", { status: 400 });
    
    const pendingTx = await env.DB.prepare("SELECT phone_number FROM transactions WHERE id = ? AND status = 'pending'").bind(txId).first();

    if (pendingTx) {
      const pointsEarned = Math.floor(amountKhr / 1000);

      await env.DB.prepare("UPDATE transactions SET status = 'verified', amount_khr = ?, points_earned = ? WHERE id = ?")
        .bind(amountKhr, pointsEarned, txId).run();

      await env.DB.prepare("UPDATE users SET total_points = total_points + ? WHERE phone_number = ?")
        .bind(pointsEarned, pendingTx.phone_number).run();

      return new Response("Points awarded!", { status: 200 });
    }
    return new Response("Tx verified or missing", { status: 200 });
  }

  return new Response("Event ignored", { status: 200 });
}

async function verifySignature(secret, rawBody, signature) {
  if (!secret) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const buffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('') === signature;
}
