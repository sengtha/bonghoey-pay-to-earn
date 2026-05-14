export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Verify BongHoey Signature
  const signature = request.headers.get("x-bonghoey-signature");
  if (!signature) return new Response("Missing Signature", { status: 401 });

  const rawBody = await request.text();
  const isValid = await verifySignature(env.BONGHOEY_WEBHOOK_SECRET, rawBody, signature);
  if (!isValid) return new Response("Unauthorized", { status: 401 });

  const payload = JSON.parse(rawBody);
  const eventType = payload.event;
  const txId = payload.transaction_id;

  if (!txId) return new Response("Missing transaction_id", { status: 400 });

  // ==========================================================
  // EVENT 1: receipt.paid (User Scans & Inputs Phone Number)
  // Payload: transaction_id, event, metadata, sender_input
  // ==========================================================
  if (eventType === "receipt.paid") {
    // Extract the phone number the user typed into the Note field
    const phoneNumber = payload.sender_input; 

    if (!phoneNumber) return new Response("Missing phone number", { status: 400 });

    // 1a. Ensure user account exists in the database
    await env.DB.prepare("INSERT OR IGNORE INTO users (phone_number, total_points) VALUES (?, 0)")
      .bind(phoneNumber).run();

    // 1b. Save the transaction as PENDING. 
    // We don't have the amount yet, so we set amount and points to 0 for now.
    await env.DB.prepare(`
      INSERT INTO transactions (id, phone_number, amount_khr, points_earned, status) 
      VALUES (?, ?, 0, 0, 'pending')
      ON CONFLICT(id) DO NOTHING
    `).bind(txId, phoneNumber).run();

    return new Response("Pending transaction recorded", { status: 200 });
  }

  // ==========================================================
  // EVENT 2: receipt.verified (Shop Confirmed the Payment)
  // Payload: transaction_id, event, amount, currency
  // ==========================================================
  if (eventType === "receipt.verified") {
    // Extract the final verified amount
    const amountKhr = payload.amount;

    if (!amountKhr) return new Response("Missing amount", { status: 400 });
    
    // 2a. Find the pending transaction to retrieve the user's phone number
    const pendingTx = await env.DB.prepare(
      "SELECT phone_number FROM transactions WHERE id = ? AND status = 'pending'"
    ).bind(txId).first();

    if (pendingTx) {
      // 2b. Calculate Points (Example: 1000 KHR = 1 Point)
      const pointsEarned = Math.floor(amountKhr / 1000);

      // 2c. Mark transaction as VERIFIED, and update it with the final amount and points
      await env.DB.prepare("UPDATE transactions SET status = 'verified', amount_khr = ?, points_earned = ? WHERE id = ?")
        .bind(amountKhr, pointsEarned, txId).run();

      // 2d. Add the actual points to the user's wallet
      await env.DB.prepare("UPDATE users SET total_points = total_points + ? WHERE phone_number = ?")
        .bind(pointsEarned, pendingTx.phone_number).run();

      return new Response("Receipt verified and points awarded!", { status: 200 });
    } else {
      // Either it was already verified, or the user never typed a phone number (no pending record)
      return new Response("Transaction already verified or missing user data", { status: 200 });
    }
  }

  return new Response("Event ignored", { status: 200 });
}

// HMAC SHA-256 WebCrypto Helper
async function verifySignature(secret, rawBody, signature) {
  if (!secret) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const generatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return generatedSignature === signature;
}
