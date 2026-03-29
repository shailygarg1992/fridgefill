# FridgeFill — Product Requirements Document

**Version:** 1.1  
**Date:** March 28, 2026  
**Platform:** Progressive Web App (PWA)  
**Author:** Claude (AI Product Architect)

---

## 1. Executive Summary

FridgeFill is a PWA that lets a user photograph their fridge, uses AI vision to identify current contents, cross-references against their personal purchase history and buying patterns, and generates a smart restock list with one-tap links to add items on Walmart.com.

The app also acts as a smart budget manager: it monitors prices on frequently purchased items and alerts the user to sale opportunities worth stocking up on ("Strategic Buys"), and it intelligently fills the cart to Walmart's $35 free delivery threshold without suggesting wasteful purchases.

The app is designed for a single user with minimal coding experience. It must be installable on an iPhone via "Add to Home Screen" and feel like a native app.

---

## 2. User Profile (Derived from Order Data)

### 2.1 Order History Analysis

Five Walmart orders were analyzed spanning **March 5 – March 25, 2026** (20 days).

| Order Date | Items | Subtotal | Key Items |
|---|---|---|---|
| Mar 05 | 7 items | $37.56 | Honey, swim diapers, bread, milk (2% + a2), pears, apples |
| Mar 14 | 8 items | $36.30 | Strawberries, bananas, vegetable oil, shredded cheese, dressing, milk, eggs |
| Mar 18 | 12 items | $44.38 | Grapes, hair color, cheese sticks, bread, laundry soap, spinach mix, shaving cream, hamburger buns, fruits |
| Mar 21 | 3 items | $42.12 | Diapers (bulk 192ct), milk (2% + a2) |
| Mar 25 | 12 items | $62.36 | Bananas, spinach mix, eggs, milk, frozen mango, frozen berries, chickpeas (x10), oranges, potatoes, apples, pears |

### 2.2 Buying Pattern Summary

**Every-order staples (restock every 4–7 days):**
- a2 Milk Vitamin D Whole Milk, 59 oz — ordered in *all 5* orders, always Qty 2
- Great Value 2% Reduced Fat Milk, Gallon — ordered in 4 of 5 orders, usually Qty 2

**Weekly regulars (every 7–10 days):**
- Fresh Fuji Apples, 3 lb bag — 3 of 5 orders
- Fresh Bartlett Pears, 3 lb bag — 3 of 5 orders
- Marketside Cage-Free Large Brown Eggs, 18 ct — 2 of 5 orders (~every 11 days)
- Marketside Fresh Spinach and Spring Mix, 11 oz — 2 of 5 orders (~every 7 days)
- Great Value 100% Whole Wheat Round Top Bread, 20 oz — 2 of 5 orders

**Bi-weekly / occasional:**
- Marketside Fresh Organic Bananas — 2 of 5 orders
- Fresh Strawberries, 1 lb — 2 of 5 orders
- Great Value Mild Cheddar Finely Shredded Cheese — 1 order (Qty 2)
- Frozen fruits (mango chunks, triple berry blend) — 1 order (bulk buy)
- Great Value Garbanzos Chick Peas — 1 order (Qty 10, pantry stocking)

**Monthly / as-needed non-grocery:**
- Diapers (Pampers Splashers Size 4 OR Parent's Choice Size 4)
- L'Oreal Hair Color
- Barbasol Shaving Cream
- Zote Laundry Bar Soap

### 2.3 Estimated Restock Cadence

| Category | Frequency | Avg Spend/Order |
|---|---|---|
| Milk (a2 + 2%) | Every 4–5 days | ~$13 |
| Fresh fruit | Every 5–7 days | ~$10 |
| Eggs | Every 10–11 days | ~$4 |
| Bread | Every 10–13 days | ~$2 |
| Greens/spinach | Every 7–10 days | ~$4 |
| Diapers | Every 16+ days | ~$16–25 |
| Overall order | Every 4–5 days | ~$33–55 |

---

## 3. Product Vision

### 3.1 Problem Statement

The user orders groceries from Walmart approximately every 4–5 days. Three core pain points exist:

1. **Memory load:** Manually remembering what's running low, opening Walmart.com, searching for each item, and adding them to the cart is tedious and error-prone. Items get forgotten.
2. **Free delivery threshold:** Walmart requires a $35 minimum for free delivery. The user often needs to mentally calculate whether their cart qualifies, and either over-buys wastefully or under-buys and pays the $9.95 fee.
3. **Missed savings:** Items the user regularly buys go on sale, but there's no easy way to know when to stock up strategically vs. buy at regular price.

### 3.2 Solution

Open FridgeFill → snap a photo of the fridge → the app tells you what you need and gives you one-tap Walmart links. Over time, it learns your patterns and proactively suggests items even if the camera can't see them (e.g., diapers, pantry items, frozen foods).

### 3.3 One-Line Pitch

*"Snap your fridge. Get your Walmart cart."*

---

## 4. Feature Requirements

### Phase 1 — Fridge Scan + Smart Restock (Build Now)

#### F1.1 Camera Capture
- Full-screen camera view optimized for iPhone
- Tap-to-capture with option to retake
- Support for multiple photos (fridge door, shelves, drawers)
- Also support uploading photos from camera roll

#### F1.2 AI Fridge Analysis
- Send photo(s) to Claude API (claude-sonnet-4-20250514) with vision
- System prompt includes the user's known purchase history (hardcoded initially from the 5 orders above)
- Claude identifies: items present, estimated quantities (full/half/low/empty), and items that are recognizably missing based on purchase patterns
- Response returned as structured JSON

#### F1.3 Smart Restock Engine
- Compare fridge contents against the user's known staples list
- Calculate days since last order for each staple
- Flag items as: "Need now" (overdue or empty), "Need soon" (running low), "Stocked" (visible and sufficient)
- Include non-visible items that are due based on cadence (e.g., diapers, pantry items) as a "Don't forget" section

#### F1.4 Walmart Cart Builder
- Each recommended item generates a Walmart.com search link: `https://www.walmart.com/search?q={item+name}`
- Links use the exact product names from the user's order history (e.g., "Great Value 2% Reduced Fat Milk Gallon 128 fl oz") for maximum search accuracy
- One-tap opens Walmart in Safari/Walmart app
- "Add All" button copies the full list to clipboard for manual use

#### F1.5 Shopping List View
- Clean, scannable list grouped by: Need Now, Need Soon, Don't Forget, Strategic Buy
- Each item shows: name, typical quantity, estimated price, days since last purchase
- Swipe to dismiss items you don't need this time
- Running cart total displayed prominently with free delivery progress bar
- Total estimated cost at the bottom

#### F1.6 Smart Cart Filler ($35 Free Delivery Optimizer)

**Problem:** Walmart charges $9.95 for delivery under $35. The user shouldn't have to manually pad the cart, and shouldn't be pushed to buy things that will go to waste.

**Logic:**
When the restock list total is between $25 and $34.99, the Smart Cart Filler activates and suggests items to reach $35. Suggestions follow a strict priority hierarchy to ensure zero waste:

1. **Pull-forward staples** (highest priority): Items the user will definitely buy in the next 1–2 orders anyway. Example: if eggs were last ordered 8 days ago and the user's average is 11 days, suggest pulling them into this order ("You'll need eggs in ~3 days anyway — add now to hit free delivery").
2. **Long-shelf-life staples**: Non-perishable items from the user's history that won't spoil — honey, vegetable oil, chickpeas, frozen fruits. These are safe to stock up on.
3. **Upcoming non-grocery needs**: Diapers, laundry soap, shaving cream — items with long shelf life that the user will eventually need.
4. **Never suggest**: Extra perishables the user doesn't regularly buy, random items outside their purchase history, or quantities beyond their normal usage.

**UI behavior:**
- When cart is $0–$24.99: No filler suggestions yet (user is still building their list)
- When cart is $25.00–$34.99: A "Free Delivery Zone" section appears with a progress bar showing "$X.XX more for free delivery" and 2–3 smart suggestions
- When cart is $35.00+: Green checkmark — "Free delivery unlocked!"
- The filler section includes a brief reason for each suggestion (e.g., "Due in ~3 days" or "Won't expire — stock up")

**Edge cases:**
- If the cart is under $25 but has very few items, don't aggressively upsell — the user may be intentionally making a small order
- If no sensible filler items exist, honestly say "No good filler options — consider combining with your next order to save $9.95"
- Never push the cart significantly past $35 (aim for $35–$40 range)

#### F1.7 Strategic Buy Alerts (Sale Price Detection)

**Problem:** The user buys certain items at predictable prices. When those items go on sale (Walmart Rollbacks, clearance, temporary price drops), it's a smart time to buy extra — especially for non-perishables.

**How it works:**

1. **Price memory**: The app stores the last known price for every item in the user's staples list (derived from order history). This serves as the "baseline price."
2. **Price check on scan**: Each time the user triggers a fridge scan, the app also queries Walmart search results for the user's top staple items and checks current prices against the baseline.
3. **Sale detection**: If an item's current price is 15%+ below baseline, it's flagged as a Strategic Buy.
4. **Smart stocking logic**: Claude evaluates whether it makes sense to stock up based on:
   - Is the item perishable? (Don't suggest buying 5 lbs of strawberries on sale)
   - What's the shelf life? (Frozen berries and canned goods = great to stock up; fresh bread = not worth it)
   - How much does the user typically buy? (If they buy Qty 10 chickpeas, a sale on chickpeas is a big win)
   - Storage — would buying extra actually be practical?

**Price baseline reference (from order data):**

| Item | Baseline Price | Notes |
|---|---|---|
| a2 Milk Vitamin D Whole Milk, 59 oz | $3.93/each | Perishable — don't over-stock |
| Great Value 2% Reduced Fat Milk, Gallon | $2.70 | Perishable — don't over-stock |
| Marketside Cage-Free Large Brown Eggs, 18 ct | $3.93 | Moderate shelf life |
| Fresh Fuji Apples, 3 lb Bag | $3.34 | Perishable |
| Great Value Garbanzos Chick Peas, 15.5 oz | $0.77/can | Non-perishable — great to stock up |
| Great Value Triple Berry Blend, 48 oz (Frozen) | $10.15 | Frozen — great to stock up |
| Great Value Mango Chunks, 16 oz (Frozen) | $3.07 | Frozen — great to stock up |
| Great Value Raw Honey, 16 oz | $5.64 | Non-perishable — great to stock up |
| Great Value Vegetable Oil, 1 Gallon | $8.43 | Non-perishable — great to stock up |
| Parent's Choice Diapers Size 4, 192 ct | $24.64 | Non-perishable — great to stock up |

**UI:**
- "Strategic Buy" section with a gold/star badge appears in the results screen
- Each item shows: regular price, sale price, savings amount, and a reason ("Non-perishable, stock up!" or "Good price but perishable — buy your usual amount")
- Strategic Buy items are also factored into the $35 free delivery calculation

### Phase 2 — Gmail Order Sync (Build Later)

#### F2.1 Gmail OAuth Integration
- "Connect Gmail" button using Google OAuth 2.0
- Request read-only access to Gmail
- Only search for emails from Walmart order confirmations

#### F2.2 Order History Parser
- Search Gmail for subjects containing "Your Walmart order" or from walmart.com
- Parse email HTML to extract: item names, quantities, prices, order dates
- Build a local purchase history database (stored in browser via in-memory state, synced to a lightweight backend)

#### F2.3 Predictive Restock AI
- With full order history, Claude calculates per-item restock frequency
- Predicts when each staple will run out based on last purchase date + average consumption interval
- Generates proactive "time to reorder" notifications
- Learns new items as they appear in orders
- Adapts to seasonal changes (e.g., swim diapers in summer)

#### F2.4 Smart Substitutions
- If a regularly ordered item becomes unavailable (like the strawberries in the Mar 14 order), suggest alternatives
- Track brand preferences (e.g., user prefers Great Value for staples, a2 for specialty milk)

### Phase 3 — Future Enhancements (Stretch)

#### F3.1 Pantry & Freezer Scan
- Separate camera modes for pantry and freezer
- Track non-refrigerated staples (chickpeas, oil, laundry supplies)

#### F3.2 Recipe Integration
- Based on what's in the fridge, suggest recipes
- Auto-add missing recipe ingredients to the Walmart cart

#### F3.3 Monthly Budget Dashboard
- Weekly/monthly spend trends from order history
- Savings tracker: how much you've saved via Strategic Buys and free delivery optimization
- Category breakdown (dairy, fruit, baby, household)

#### F3.4 Price History Charts
- Track price trends for staple items over time
- Identify best days/weeks to buy certain items
- Set price alerts: "Notify me when diapers drop below $22"

---

## 5. Technical Architecture

### 5.1 System Overview

```
┌─────────────────────────────────────┐
│         iPhone (Safari PWA)          │
│  ┌─────────┐  ┌──────────────────┐  │
│  │ Camera   │  │  Shopping List   │  │
│  │ Capture  │  │  + Walmart Links │  │
│  └────┬─────┘  └───────▲──────────┘  │
│       │                │             │
│       ▼                │             │
│  ┌─────────────────────┴──────────┐  │
│  │      React Frontend (PWA)      │  │
│  └────────────┬───────────────────┘  │
└───────────────┼───────────────────────┘
                │ HTTPS
                ▼
┌───────────────────────────────────────┐
│     Vercel Serverless Backend         │
│  ┌──────────────────────────────────┐ │
│  │  /api/analyze-fridge             │ │
│  │  - Receives photo (base64)       │ │
│  │  - Calls Claude Vision API       │ │
│  │  - Returns structured restock    │ │
│  │    list as JSON                  │ │
│  └──────────────────────────────────┘ │
│  ┌──────────────────────────────────┐ │
│  │  /api/parse-orders (Phase 2)     │ │
│  │  - Gmail OAuth callback          │ │
│  │  - Fetches Walmart emails        │ │
│  │  - Parses order data             │ │
│  └──────────────────────────────────┘ │
└───────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│        Anthropic Claude API           │
│  - Model: claude-sonnet-4-20250514    │
│  - Vision: Fridge photo analysis      │
│  - NLP: Order prediction + restock    │
└───────────────────────────────────────┘
```

### 5.2 Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | React (JSX) | Simple, component-based, works as PWA |
| Styling | Tailwind CSS | Rapid UI development |
| Hosting | Vercel | Free tier, serverless functions, easy deploy |
| AI Vision | Claude API (Sonnet) | Best-in-class image understanding, natural language instructions |
| Backend API | Vercel Serverless Functions (Node.js) | No server management, auto-scales |
| Auth (Phase 2) | Google OAuth 2.0 | Gmail read access for order parsing |
| Data Storage | React state + localStorage (Phase 1), Vercel KV (Phase 2) | Simple for single user |

### 5.3 API Design

#### POST /api/analyze-fridge

**Request:**
```json
{
  "images": ["base64_encoded_photo_1", "base64_encoded_photo_2"],
  "purchase_history": [
    {
      "date": "2026-03-25",
      "items": [
        { "name": "a2 Milk Vitamin D Whole Milk 59 oz", "qty": 2, "price": 7.86 },
        { "name": "Marketside Cage-Free Large Brown Eggs 18 Count", "qty": 1, "price": 3.93 }
      ]
    }
  ],
  "today": "2026-03-28"
}
```

**Response:**
```json
{
  "fridge_contents": [
    { "item": "Milk (a2 whole)", "status": "low", "confidence": 0.85 },
    { "item": "Eggs", "status": "present", "confidence": 0.9 }
  ],
  "restock_list": [
    {
      "item": "a2 Milk Vitamin D Whole Milk 59 oz",
      "urgency": "need_now",
      "reason": "Last ordered Mar 25, typically every 4 days. Appears low in photo.",
      "qty": 2,
      "est_price": 7.86,
      "walmart_search": "https://www.walmart.com/search?q=a2+Milk+Vitamin+D+Whole+Milk+59+oz"
    },
    {
      "item": "Parent's Choice Dry & Gentle Diapers Size 4 192 Count",
      "urgency": "dont_forget",
      "reason": "Last ordered Mar 21. Not visible in fridge (non-fridge item). May be running low.",
      "qty": 1,
      "est_price": 24.64,
      "walmart_search": "https://www.walmart.com/search?q=Parent%27s+Choice+Diapers+Size+4+192+Count"
    }
  ],
  "estimated_total": 45.50,
  "free_delivery": {
    "threshold": 35.00,
    "current_total": 28.50,
    "gap": 6.50,
    "status": "needs_filler",
    "filler_suggestions": [
      {
        "item": "Marketside Cage-Free Large Brown Eggs, 18 Count",
        "reason": "You'll need these in ~3 days anyway",
        "strategy": "pull_forward_staple",
        "est_price": 3.93,
        "walmart_search": "https://www.walmart.com/search?q=Marketside+Cage+Free+Large+Brown+Eggs+18+Count"
      },
      {
        "item": "Great Value 100% Whole Wheat Round Top Bread, 20 oz",
        "reason": "Due in ~5 days — pull forward to hit free delivery",
        "strategy": "pull_forward_staple",
        "est_price": 1.95,
        "walmart_search": "https://www.walmart.com/search?q=Great+Value+Whole+Wheat+Bread+20+oz"
      }
    ],
    "new_total_with_fillers": 34.38,
    "remaining_gap": 0.62,
    "recommendation": "Add eggs and bread to unlock free delivery. You'll need both within the week."
  },
  "strategic_buys": [
    {
      "item": "Great Value Garbanzos Chick Peas, 15.5 oz",
      "baseline_price": 0.77,
      "current_price": 0.58,
      "discount_pct": 25,
      "savings_per_unit": 0.19,
      "recommended_qty": 10,
      "total_savings": 1.90,
      "reason": "Non-perishable pantry staple, 25% off — stock up at your usual quantity.",
      "walmart_search": "https://www.walmart.com/search?q=Great+Value+Garbanzos+Chick+Peas+15.5+oz"
    }
  ]
}
```

### 5.4 Claude Vision Prompt Strategy

The system prompt sent with each fridge photo will include:

1. **Role:** "You are a grocery inventory analyst and smart budget optimizer."
2. **Purchase history:** The full item list with dates, quantities, and prices from all known orders.
3. **Task:** "Analyze this fridge photo. Identify every item you can see and estimate if it's full, half, low, or empty. Then compare against the purchase history to determine what needs restocking."
4. **Output format:** Strict JSON schema (as defined above).
5. **Non-visible items:** "Also flag non-fridge items from purchase history that are due for reorder based on their typical purchase frequency (e.g., diapers, laundry supplies, pantry items)."
6. **Free delivery optimization:** "If the restock list total is between $25 and $34.99, suggest 1–3 items to reach the $35 free delivery threshold. Prioritize: (a) staples the user will need within the next 1–2 orders anyway, (b) non-perishable items from their history, (c) long-shelf-life household items. Never suggest random items outside their purchase history or extra perishables that would go to waste."
7. **Strategic buys:** "Compare the user's baseline prices against current prices provided. If any staple item is 15%+ below its baseline, flag it as a Strategic Buy. Recommend stocking up only if the item is non-perishable or frozen. For perishables, recommend buying the normal quantity at the sale price."

### 5.5 PWA Configuration

The app must include:
- `manifest.json` with app name "FridgeFill", icon, theme color, and `display: standalone`
- Service worker for offline shell caching
- Meta tags for iOS: `apple-mobile-web-app-capable`, status bar style, splash screen
- Camera access via `<input type="file" accept="image/*" capture="environment">`

---

## 6. User Interface Specifications

### 6.1 Screen Flow

```
[Home Screen]
    │
    ├── "Scan Fridge" button → [Camera View] → [Analyzing...] → [Results]
    │                                                              │
    │                                                    ├── Need Now
    │                                                    ├── Need Soon
    │                                                    ├── Don't Forget
    │                                                    ├── 🟡 Free Delivery Zone ($X more)
    │                                                    ├── ⭐ Strategic Buys (on sale)
    │                                                    └── [Open in Walmart] buttons
    │
    ├── "My Staples" → [Editable list of regularly purchased items]
    │
    └── "Order History" → [Past orders with dates and items] (Phase 2: auto-populated)
```

### 6.2 Screen Details

**Home Screen:**
- App logo and tagline
- Large "Scan My Fridge" CTA button
- Quick stats: "Last scanned: 2 days ago" / "You typically order every 4–5 days"
- Secondary links: My Staples, Order History

**Camera/Capture Screen:**
- Full-bleed camera viewfinder
- "Take Photo" button
- Thumbnail strip of captured photos
- "Analyze" button when at least 1 photo is taken

**Results Screen:**
- **Free Delivery Progress Bar** at the top: visual bar showing cart total vs $35 threshold. Green when met, amber when close ($25–$34.99), gray when under $25
- Four collapsible sections:
  - **Need Now** (red badge): Items overdue or empty
  - **Need Soon** (yellow badge): Items running low
  - **Don't Forget** (blue badge): Non-visible items due by cadence
  - **Strategic Buy** (gold star badge): Items currently on sale — shows regular price crossed out, sale price, and savings. Only appears when sales are detected
- **Free Delivery Zone** (appears when cart is $25–$34.99): Shows 2–3 smart filler suggestions with reasons like "Due in 3 days — add now to save $9.95 delivery." Each suggestion has an [Add] toggle
- Each item row: product name, qty, est. price, [Add to Walmart] button
- Bottom sticky bar: cart total, delivery status (free or $9.95), savings summary, and "Open All in Walmart" button
- Swipe-to-dismiss on items you don't want — cart total and free delivery bar update in real-time

**My Staples Screen:**
- Editable list pre-populated from order history
- Add/remove items
- Set preferred quantities and brands
- Toggle items on/off without deleting

---

## 7. Data Model

### 7.1 Staple Item

```typescript
interface StapleItem {
  id: string;
  name: string;                    // Exact Walmart product name
  category: 'dairy' | 'fruit' | 'vegetable' | 'protein' | 'grain' |
             'frozen' | 'pantry' | 'baby' | 'personal_care' | 'household';
  typicalQty: number;              // Usual order quantity
  typicalPrice: number;            // Last known price (baseline)
  priceHistory: {                  // Track prices over time
    date: string;
    price: number;
  }[];
  avgFrequencyDays: number;        // Average days between purchases
  lastOrderDate: string;           // ISO date
  isVisible: boolean;              // Can the camera see this item? (fridge vs pantry)
  isPerishable: boolean;           // Affects stock-up recommendations
  shelfLifeDays: number;           // Estimated shelf life for smart stocking
  walmartSearchQuery: string;      // Pre-built search URL
  active: boolean;                 // User can toggle off
}
```

### 7.2 Cart Optimization State

```typescript
interface CartState {
  items: CartItem[];
  subtotal: number;
  freeDeliveryThreshold: 35.00;
  deliveryFee: 9.95;
  freeDeliveryMet: boolean;
  gap: number;                     // Amount needed to reach $35
  fillerSuggestions: {
    item: StapleItem;
    reason: string;
    strategy: 'pull_forward' | 'long_shelf_life' | 'non_grocery_need';
    daysUntilNeeded: number;
  }[];
  strategicBuys: {
    item: StapleItem;
    currentPrice: number;
    baselinePrice: number;
    discountPct: number;
    recommendedQty: number;
    stockUpSafe: boolean;          // Based on perishability
    reason: string;
  }[];
  totalSavings: number;            // From strategic buys + avoided delivery fees
}
```

### 7.2 Fridge Scan Result

```typescript
interface FridgeScanResult {
  scanDate: string;
  photos: string[];                // base64 images
  identifiedItems: {
    name: string;
    status: 'full' | 'half' | 'low' | 'empty' | 'not_found';
    confidence: number;
  }[];
  restockList: RestockItem[];
  estimatedTotal: number;
}
```

---

## 8. Hardcoded Staples List (Phase 1 Default)

Based on the 5-order analysis, the app ships with this pre-loaded staples profile:

| Item | Category | Typical Qty | Avg Frequency | Fridge Visible | Perishable | Shelf Life | Stock-Up Safe |
|---|---|---|---|---|---|---|---|
| a2 Milk Vitamin D Whole Milk, 59 oz | Dairy | 2 | 4 days | Yes | Yes | ~7 days | No |
| Great Value 2% Reduced Fat Milk, Gallon | Dairy | 2 | 5 days | Yes | Yes | ~7 days | No |
| Marketside Cage-Free Large Brown Eggs, 18 ct | Protein | 1 | 11 days | Yes | Semi | ~21 days | Moderate |
| Great Value 100% Whole Wheat Bread, 20 oz | Grain | 1 | 13 days | Yes | Semi | ~10 days | No |
| Marketside Fresh Spinach and Spring Mix, 11 oz | Vegetable | 1 | 7 days | Yes | Yes | ~5 days | No |
| Fresh Fuji Apples, 3 lb Bag | Fruit | 1 | 7 days | Yes | Semi | ~14 days | Moderate |
| Fresh Bartlett Pears, 3 lb Bag | Fruit | 1 | 7 days | Yes | Semi | ~10 days | Moderate |
| Marketside Fresh Organic Bananas, Bunch | Fruit | 1 | 10 days | Yes | Yes | ~5 days | No |
| Fresh Strawberries, 1 lb | Fruit | 1 | 10 days | Yes | Yes | ~4 days | No |
| Great Value Mild Cheddar Shredded Cheese, 8 oz | Dairy | 2 | 14 days | Yes | Semi | ~30 days | Moderate |
| Great Value Vegetable Oil, 1 Gallon | Pantry | 1 | 20+ days | No | No | ~365 days | **Yes** |
| Great Value Garbanzos Chick Peas, 15.5 oz | Pantry | 10 | 20+ days | No | No | ~730 days | **Yes** |
| Great Value Mango Chunks, 16 oz (Frozen) | Frozen | 1 | 20+ days | No | No | ~180 days | **Yes** |
| Great Value Triple Berry Blend, 48 oz (Frozen) | Frozen | 1 | 20+ days | No | No | ~180 days | **Yes** |
| Parent's Choice Diapers Size 4, 192 ct | Baby | 1 | 16 days | No | No | N/A | **Yes** |
| Great Value Raw Honey, 16 oz | Pantry | 1 | 20+ days | No | No | Indefinite | **Yes** |

---

## 9. Deployment Plan

### Step 1: Local Development
- Create React app with Vite
- Build all Phase 1 screens
- Test camera capture on iPhone via `localhost` (requires HTTPS — use ngrok or Vite's `--host` with self-signed cert)

### Step 2: Vercel Deployment
- Push to GitHub repository
- Connect repo to Vercel
- Add `ANTHROPIC_API_KEY` as environment variable
- Deploy — get a `.vercel.app` URL

### Step 3: iPhone Installation
- Open the Vercel URL in Safari on iPhone
- Tap Share → "Add to Home Screen"
- App icon appears on home screen, launches in standalone mode

### Step 4: Iterate
- Test with real fridge photos
- Tune the Claude prompt based on accuracy
- Adjust staples list based on actual usage

---

## 10. Cost Estimate

| Component | Cost |
|---|---|
| Vercel hosting (Hobby tier) | Free |
| Claude API (Sonnet, ~2 scans/week) | ~$0.50–1.00/month |
| Google OAuth (Phase 2) | Free |
| Domain name (optional) | ~$12/year |
| **Total** | **~$1/month** |

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Claude misidentifies fridge items | Wrong restock suggestions | Allow user to correct results; feedback improves prompt over time |
| Walmart product names change | Broken search links | Use flexible search queries; fall back to category search |
| iPhone camera permissions denied | App can't function | Clear onboarding explaining why camera is needed |
| Claude API latency (5–10 sec) | User waits | Engaging loading animation with progress messages |
| Walmart blocks search URL pattern | Cart building breaks | Offer clipboard copy of item list as fallback |
| Photo quality in dim fridge | Poor analysis | Guide user to turn on fridge light; support flash |
| Walmart price scraping fails or is inaccurate | Strategic Buy alerts are wrong | Use conservative 15% threshold; show "price may vary" disclaimer; user can update baseline prices manually |
| Smart Cart Filler suggests items user doesn't want | Annoying experience, erodes trust | Always explain *why* each filler is suggested; make it easy to dismiss; never auto-add to cart |
| Walmart changes $35 free delivery threshold | Broken threshold logic | Make the threshold configurable in app settings; default to $35 |
| User's prices differ from online prices (store vs delivery) | Inaccurate totals | Note that estimates are based on Walmart.com delivery prices; actual may vary with associate discount |

---

## 12. Success Metrics

- **Primary:** Time from "I need groceries" to "Walmart cart is ready" < 2 minutes
- **Accuracy:** 80%+ of restock suggestions are relevant (user doesn't dismiss them)
- **Adoption:** User scans fridge at least 1–2x per week (matching current order frequency)
- **Cart value accuracy:** Estimated total within 15% of actual Walmart cart total
- **Free delivery rate:** 100% of orders hit the $35 threshold (vs. current ~100% but with less mental effort)
- **Zero waste filler:** 90%+ of Smart Cart Filler suggestions are items the user actually uses within 2 weeks
- **Strategic Buy savings:** Track cumulative savings from sale alerts; target $5–10/month in savings
- **Delivery fee savings:** Track avoided $9.95 fees; target $0 delivery fees per month

---

## 13. Next Step

**Build the Phase 1 prototype** — a working React PWA with camera capture, Claude vision integration, hardcoded staples list, and Walmart search links. Deployable to Vercel and installable on iPhone within one session.
