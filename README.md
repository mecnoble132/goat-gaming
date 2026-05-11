# Goat Gaming - Station Manager

Professional gaming station management and billing software.

## Features

- **Billing & Loyalty**: Automated billing with integrated loyalty points system.
- **Station Management**: Track PS5, Snooker, and Pool sessions.
- **Inventory Tracking**: Manage products and low-stock alerts.
- **WhatsApp Integration**: Automated bill delivery via WhatsApp.

## Run Locally

**Prerequisites:** Node.js (v20 or later recommended)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configuration:**
   Copy `.env.example` to `.env.local` and fill in your Supabase and Gemini credentials.
   ```bash
   cp .env.example .env.local
   ```

3. **Run the app:**
   ```bash
   npm run dev
   ```

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide Icons
- **Backend**: Supabase
- **AI**: Google Gemini
