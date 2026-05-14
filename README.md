# 🎁 Pay-to-Earn Rewards Platform

A decentralized, serverless loyalty and gamification platform designed to accelerate digital adoption for Cambodian MSMEs. Built on Cloudflare Pages and D1, this system integrates seamlessly with the **BongHoey** KHQR payment gateway to automatically convert customer payments into loyalty points.

## ✨ Key Features
* **Automated Point Issuance:** Customers earn points automatically when they pay via KHQR (Default: 1,000 KHR = 1 Point).
* **2-Step Verification:** Uses BongHoey's `receipt.paid` and `receipt.verified` webhooks to securely issue points only after merchant confirmation.
* **Frictionless Onboarding:** Sends a "Magic Link" back to the BongHoey app so users can claim their points and secure their wallet with a 4-digit PIN.
* **Gamified Lucky Draw:** Customers can spend points to spin a weighted probability wheel for physical rewards (e.g., Free Coffee, Discounts).
* **Shop Admin Portal:** MSMEs can easily manage physical gift inventory, set win probabilities (rarity weights), and monitor stock.

---

## 🏗 Architecture
This app runs 100% at the edge using:
* **Frontend:** React + Vite
* **Backend:** Cloudflare Pages Functions (Serverless APIs)
* **Database:** Cloudflare D1 (Serverless SQLite)
* **Payment/OCR Gateway:** BongHoey Webhooks

---

## 🚀 Step 1: Deploying the Application (Cloudflare & GitHub)

### 1. Database Setup (Cloudflare)
1. Log into the [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Navigate to **Workers & Pages** -> **D1 SQL Database**.
3. Click **Create Database** and name it `rewards_db`.
4. **Copy the Database ID** (you will need this for your `wrangler.toml` file).

### 2. GitHub Setup
1. Push this repository to your GitHub account.
2. Open `wrangler.toml` and replace `PASTE_YOUR_DATABASE_ID_HERE` with your actual D1 Database ID.
3. Commit the changes.

### 3. Cloudflare Pages Deployment
1. In Cloudflare, go to **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**.
2. Select your GitHub repository.
3. **Build Settings:**
   * Framework preset: `None`
   * Build command: `npm run build`
   * Build output directory: `dist`
4. **Environment Variables:**
   * Add a variable named `BONGHOEY_WEBHOOK_SECRET`. Set it to a strong, random password (you will paste this into BongHoey later).
5. Click **Save and Deploy**. Cloudflare will generate your live URL (e.g., `https://pay-to-earn.pages.dev`).

### 4. Initialize the Database
Once the deployment finishes, open your browser and visit:
`https://YOUR_APP.pages.dev/api/init-db`
You should see a success message. Your tables and starter gifts are now created!

---

## ⚙️ Step 2: BongHoey Configuration

To connect the payment gateway to your new app, you need to configure your BongHoey Merchant settings.

### 1. Set Up the Webhook
1. Log into your **BongHoey Merchant Dashboard**.
2. Navigate to the **Webhook / Integrations** settings.
3. **Webhook URL:** Enter your Cloudflare Pages API endpoint:
   `https://YOUR_APP.pages.dev/api/webhook`
4. **Webhook Secret:** Paste the exact same secret you used for `BONGHOEY_WEBHOOK_SECRET` in Cloudflare.
5. Save the configuration.

### 2. Instructing Your Customers
For the system to track who made the payment, the customer must provide their phone number. 
* Tell customers to type their **Phone Number** into the **"Note / សំណួរ"** field when they upload their bank receipt to BongHoey.

### 3. The Webhook Flow in Action
1. **User Scans & Uploads:** Customer pays, uploads the receipt, and enters their phone number. BongHoey sends the `receipt.paid` event.
2. **Magic Link Generated:** Your app logs a pending transaction and sends back a Magic Link button.
3. **User Claims:** The user clicks "Setup Account & Claim" in BongHoey, landing on your app to create a PIN.
4. **Shop Verifies:** The MSME owner checks their bank app and approves the receipt in BongHoey. BongHoey sends the `receipt.verified` event.
5. **Points Awarded:** Your app converts the KHR amount to points and deposits them into the user's secured wallet!

---

## 🛠 Admin Dashboard
To manage your physical gifts and adjust the Lucky Draw weights:
1. Visit your app URL.
2. Click **Shop Admin Login**.
3. *(Highly Recommended)*: Protect the `/admin` UI route using **Cloudflare Zero Trust** so only authorized MSME staff can access the inventory management system.
