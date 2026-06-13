# SPX Brain — Knowledge Bank

Personal knowledge base for SPX Express. Just dump your thoughts — it auto-categorizes, tags, and connects them using local keyword matching. No API key needed.

---

## Deploy to Vercel (3 minutes, free, no coding)

### Step 1: Create a GitHub repo
1. Go to **[github.com/new](https://github.com/new)**
2. Name it `spx-brain`, set to Private, click **Create repository**
3. On the repo page, click **"uploading an existing file"**
4. Unzip the downloaded file and **drag all the files/folders** into the upload area
5. Click **Commit changes**

### Step 2: Deploy on Vercel
1. Go to **[vercel.com](https://vercel.com)** → Sign up with GitHub
2. Click **"Add New Project"**
3. Find and select your `spx-brain` repo
4. Click **Deploy** (no environment variables needed!)
5. Wait ~60 seconds → you get a live URL like `spx-brain-xyz.vercel.app`

### Step 3: Add to phone home screen
- **iPhone**: Open URL in Safari → Share → "Add to Home Screen"
- **Android**: Open in Chrome → ⋮ menu → "Add to Home screen"

Done. You now have a live website + mobile app.

---

## How it works

1. **Type anything** — a finding, process note, meeting insight, whatever
2. **Hit Save** — the app instantly:
   - Auto-categorizes into: EHA Revamp, Fraud, Non-AWB Matching, Ops Process, Returns & Refunds, Data & BI, Strategy, or General
   - Extracts relevant tags using a domain-specific dictionary (ghost-received, match-rate, ncr, hub-ops, etc.)
   - Finds and links related entries using text similarity + tag overlap
3. **Search & filter** — by keyword, tag, or category
4. **Navigate connections** — tap any entry → see linked entries → tap through
5. **Edit & reclassify** — update entries, re-run classification
6. **Export/import** — JSON backup anytime

## Data storage

Everything lives in your browser's localStorage:
- Persists across sessions
- Different devices = separate data (use export/import to sync)
- Clear browser data = data gone → **export regularly as backup**

## Future: add AI classification

When you want smarter categorization, get an Anthropic API key and I can add a `/api/classify` serverless endpoint. The local engine works well for now.
