# FridgeFill — Technical Guide for PMs

This explains every technical decision we made, in plain language, so you understand *why* things work the way they do and can make informed product decisions.

---

## 1. The Architecture (How the pieces fit together)

```
Your iPhone (Safari)
    ↓ takes photo
React App (the frontend — what users see and tap)
    ↓ compresses photo, sends to server
Vercel Serverless Function (the backend — runs our code in the cloud)
    ↓ sends photo + your order history
Claude API (AI brain — analyzes the image)
    ↓ returns JSON with restock recommendations
React App displays the results
    ↓ user taps item
Opens Walmart.com search for that exact product
```

**Why this matters for you as PM:**
- The user never talks to Claude directly — our server does. This keeps your API key secret.
- The AI call takes 5-10 seconds. That's why we have the loading animation with fun messages.
- If Claude's API goes down, the whole scan feature breaks. Everything else (home screen, staples list) still works because it's all local.

---

## 2. What is a PWA? (Progressive Web App)

A PWA is a website that can be "installed" on a phone and behave like a native app. We chose this over building a native iOS app because:

| | PWA | Native iOS App |
|---|---|---|
| **Build time** | Hours | Weeks |
| **App Store approval** | Not needed | 1-7 days review |
| **Cost** | Free | $99/year Apple Developer fee |
| **Updates** | Instant (just redeploy) | Submit new version, wait for review |
| **Limitations** | No push notifications on iOS (until recently), slightly less polished | Full device access |

**The key files that make it a PWA:**
- `manifest.json` — tells the phone "this is an app" with a name, icon, and theme color
- `sw.js` (Service Worker) — caches the app shell so it loads even offline
- Meta tags in `index.html` — iOS-specific tags like `apple-mobile-web-app-capable`

**PM takeaway:** PWA is perfect for an MVP like this. If FridgeFill grows and needs push notifications or App Store presence, you'd build a native app later. The backend/API stays the same.

---

## 3. Frontend: React + Vite + Tailwind

**React** is a UI library. Think of it like building with LEGO — each screen is a "component" (a reusable piece):

```
App.jsx                  ← The manager — decides which screen to show
├── HomeScreen.jsx       ← Landing page with "Scan My Fridge" button
├── CameraCapture.jsx    ← Photo capture/upload screen
├── AnalyzingScreen.jsx  ← Loading spinner with fun messages
├── ResultsScreen.jsx    ← The restock list with delivery optimizer
└── StaplesScreen.jsx    ← "My Staples" list view
```

**Vite** is the build tool. It:
- Runs the app locally during development (hot reload — you edit code, browser updates instantly)
- Compiles everything into optimized files for production

**Tailwind CSS** is the styling system. Instead of writing CSS files, you add classes directly to HTML like `bg-green-600 text-white rounded-xl`. This is why we could build a polished UI quickly.

**PM takeaway:** If you want to change colors, button sizes, or layout, those are all Tailwind classes in the component files. A designer or developer can adjust them without touching any logic.

---

## 4. Backend: Vercel Serverless Functions

**What is serverless?**
Instead of renting a server that runs 24/7 ($$$), serverless functions only run when called. Think of it like a vending machine vs. hiring a full-time cashier.

Our one function: `api/analyze-fridge.js`
- Receives the compressed photo from the app
- Sends it to Claude API with the purchase history and instructions
- Returns Claude's analysis as structured data (JSON)

**Why the purchase history lives on the server:**
- It's the same every time (hardcoded from your 5 Walmart orders)
- Sending it from the phone wastes bandwidth and makes the request larger
- When you add Gmail sync (Phase 2), the server will fetch it from a database instead

**PM takeaway:** Vercel's free tier gives you plenty of capacity for personal use. If FridgeFill had 1000 users, you'd need the $20/month Pro plan.

---

## 5. The Image Compression Problem (and why it kept breaking)

This was our biggest bug. Here's the full story:

**The constraint:** Vercel's free tier limits request bodies to **4.5MB**. A single iPhone photo is **3-12MB**. So we *must* shrink the image before sending it.

**Attempt 1:** Basic FileReader → Image → Canvas approach
- **Failed because:** The Image object loaded asynchronously, and we sent the data before it finished loading → empty image error

**Attempt 2:** FileReader → Image (fixed loading) → Canvas
- **Failed because:** iPhone photos are often HEIC format (Apple's proprietary format). The `Image` object can display HEIC but `canvas` can't always convert it → "failed to compress" error

**Attempt 3:** createImageBitmap → Canvas with raw fallback
- **Failed because:** The raw fallback sent the original 12MB file when compression failed → payload too large again

**Final fix (Attempt 4):**
```
createImageBitmap(file)     ← Handles ANY format including HEIC
    ↓
Resize to max 800px         ← iPhone photos are 4032px wide, we don't need that
    ↓
Convert to JPEG at 60%      ← JPEG is universally supported, 60% quality is plenty for AI analysis
    ↓
Check if under 300KB        ← If not, shrink more (560px, then 392px, then 274px)
    ↓
Send to server              ← Guaranteed small enough
```

**PM takeaway:** Image handling on mobile is one of the trickiest parts of any photo-based app. The AI doesn't need a high-res photo — it just needs to see what's in the fridge. Compressing to 800px at 60% quality is a sweet spot: small enough to send quickly, detailed enough for AI to read labels and identify items.

---

## 6. The Claude API Integration

**What happens when you tap "Analyze":**

1. Your photo is sent to our Vercel function
2. Our function builds a "prompt" for Claude — this is the key product decision:

```
System prompt: "You are a grocery inventory analyst..."
   ↓
Image: [your fridge photo]
   ↓
Text: "Here's the purchase history... here are baseline prices...
       analyze what's in the fridge and what needs restocking.
       Return ONLY valid JSON."
```

3. Claude returns structured JSON with:
   - What it sees in the fridge and quantity levels
   - What you need to restock and why
   - Smart filler suggestions for free delivery

**Why we use Claude Sonnet (not Opus):**
- Sonnet is 5x cheaper than Opus (~$0.01-0.03 per scan vs $0.05-0.15)
- For image recognition + structured output, Sonnet is more than capable
- Faster response time (3-8 seconds vs 10-30 seconds)

**The prompt is the product.** The quality of FridgeFill's recommendations depends entirely on how well we instruct Claude. Tuning the prompt (what context to include, how to prioritize suggestions, what format to return) is where the PM has the most impact.

**PM takeaway:** You can iterate on the prompt in `api/analyze-fridge.js` without changing any frontend code. The prompt is essentially your "product spec" for the AI.

---

## 7. The $35 Free Delivery Optimizer

**How it works in code:**

1. Claude returns a restock list with estimated prices
2. The frontend adds up all checked items → `activeTotal`
3. If `activeTotal` is between $25 and $34.99, the "Free Delivery Zone" appears
4. Claude also returns `filler_suggestions` — items you'll need soon anyway
5. User can toggle suggestions on/off, and the total + progress bar update instantly

**Why $25 is the lower bound:** Below $25, the user is probably making a small intentional order. Aggressively pushing "add more stuff!" would be annoying. This is a product judgment call encoded in the code.

**PM takeaway:** The thresholds ($25 lower, $35 target) are easy to change. If Walmart changes their free delivery threshold, you update one constant in `src/data/staples.js`.

---

## 8. The Price Calculation Bug (Lesson in AI Output Contracts)

This is worth understanding as a PM because it shows a common pitfall when working with AI.

**What happened:** We told Claude to return `est_price` and `qty` for each item. But we never defined whether `est_price` meant "price per unit" or "total price for all units." Claude interpreted it inconsistently:

- Sometimes: `est_price: 3.93, qty: 2` (per-unit price) → our code calculated 3.93 x 2 = $7.86 (correct)
- Sometimes: `est_price: 7.86, qty: 2` (total already multiplied) → our code calculated 7.86 x 2 = $15.72 (double!)

With just 3 items, the cart showed $52 instead of ~$15.

**How we fixed it:**
1. Renamed the field to `unit_price` — the name itself removes ambiguity
2. Added explicit pricing rules in the prompt: "unit_price must be the price for ONE unit"
3. Added reference prices so Claude doesn't guess: "a2 Milk = $3.93/each"
4. Made the math visible: each item row shows "2 x $3.93" so you can spot errors

**PM lesson: When you give an AI a schema to fill in, be painfully explicit about what each field means.** Ambiguity in your "contract" with the AI causes bugs that are hard to catch because they're *sometimes* right. This applies to any AI product — always define your output contract precisely, with examples and constraints.

---

## 9. iOS Safe Area (Why buttons hide under the clock)

iPhones have a "safe area" — the region of the screen that isn't covered by the clock, battery indicator, notch, or Dynamic Island. If you put a button at `top: 0`, it'll sit behind the status bar.

**The fix is simple:** add top padding (`pt-14` in Tailwind = 56px) to any header that sticks to the top of the screen.

**Why we missed it on 2 screens:** We fixed the Camera screen first, but didn't audit the other screens at the same time. This is a common pattern — fixing a bug in one place but forgetting to check all the similar places. The lesson: when you fix a category of bug (like safe area padding), grep the entire codebase for all instances.

**PM takeaway:** When filing a bug like "button is behind the clock," the fix should be applied to ALL screens, not just the one screen in the screenshot. Ask the dev: "Did you check this everywhere?"

---

## 10. Deployment Pipeline

```
You write code locally
    ↓ git add + git commit
Saved to local Git (version control — like "save" with history)
    ↓ git push
Pushed to GitHub (cloud backup, collaboration)
    ↓ automatic or manual
Vercel detects changes and rebuilds
    ↓
Live at fridgefill.vercel.app within ~30 seconds
```

**Environment variables:** The Anthropic API key is stored in Vercel's settings, NOT in the code. This means:
- The key never appears on GitHub (which is public)
- You can rotate the key without changing code
- Different environments (staging, production) can have different keys

**PM takeaway:** Deploying a change is one command: `vercel --prod`. No app store reviews, no waiting. This is the speed advantage of web apps.

---

## 11. Gmail Integration (OAuth Explained)

This is the most "enterprise-y" feature we built, and it's worth understanding because OAuth is used everywhere — Google, Facebook, Slack, GitHub all use the same pattern.

**The problem:** We want to read your Walmart order emails from Gmail. But we can't just ask for your Gmail password — that's insecure and Google doesn't allow it. Instead, we use **OAuth 2.0**, which is an industry-standard way to say "let me access *specific* data in your account, with your permission, without knowing your password."

**The dance (step by step):**

```
1. User taps "Connect Gmail"
   → App sends user to Google's website

2. Google shows: "FridgeFill wants to READ your Gmail. Allow?"
   → User taps Allow
   → Google creates a one-time code

3. Google redirects user back to our app with that code
   → Our server exchanges the code for an "access token"
   → Think of the code as a claim ticket, the token as the actual key

4. Our server uses the token to search Gmail
   → Searches for: "Delivered:" emails from walmart.com
   → Cannot send, delete, or modify any emails (read-only scope)

5. Server extracts item data using regex parsing
   → The "Delivered:" emails have structured text:
     "Marketside Eggs, 18 Count $0.25/EA Qty: 1 $4.37"
   → Regex extracts item name, quantity, and price — no AI needed
   → Much faster and cheaper than using Claude

6. App stores the parsed orders locally
   → Future fridge scans use real purchase history
```

**Why "testing mode" matters:**

Google requires apps that access user data to go through a **verification process** (security review). Until verified, the app is in "testing mode" and only pre-approved test users can use it. This is why we had to add your email under OAuth consent screen > Audience > Test users.

For a personal app, testing mode is fine forever. If you wanted to let other people use FridgeFill, you'd need to submit for Google verification (~1-2 weeks review).

**Security notes:**
- The access token is stored in your browser's localStorage (on your device only)
- The token expires after ~1 hour. Refresh tokens last longer.
- We only request `gmail.readonly` scope — the minimum needed
- The app never sees your Gmail password

**PM takeaway:** OAuth is the right pattern whenever your app needs to access data from another service on behalf of a user. The setup is annoying (Google Cloud console, consent screen, credentials, test users) but it's a one-time cost. The user experience — one tap to connect — is clean.

---

## 12. Cost Breakdown

| What | Cost | Why |
|------|------|-----|
| Vercel hosting | $0/month | Free tier — 100GB bandwidth, unlimited deploys |
| Claude API (scans) | ~$0.50-1.00/month | ~$0.02 per scan × 2 scans/week × 4 weeks |
| Claude API (Gmail parsing) | $0/month | Uses regex parsing, no AI call needed |
| Google Cloud | $0 | Gmail API is free for personal use |
| Anthropic credits | $5 prepaid | Lasts ~3-6 months at current usage |
| Firebase (Firestore + Auth) | $0/month | Free tier — 50K reads, 20K writes/day |
| GitHub | $0 | Free for public repos |
| Domain name | $0 (optional $12/year) | Using fridgefill.vercel.app for now |
| **Total** | **~$0.50/month** | |

**PM takeaway:** Gmail parsing costs $0 because we use regex instead of AI. This is an extremely cheap app to run for a single user. Scaling to 100 users would cost ~$20-50/month (Vercel Pro + more API calls). Scaling to 10,000 users would require architectural changes (database, auth, rate limiting).

---

## 13. Serverless Cold Starts (Why Gmail Parsing Kept Timing Out)

This is one of the most important lessons from building FridgeFill, because it applies to any product that uses serverless functions (AWS Lambda, Vercel, Cloudflare Workers, etc.).

**What is a cold start?**

Serverless functions don't run on a server that's always on. When a request arrives:

```
1. Vercel spins up a new container      (~1-2 seconds)
2. Loads your code + all dependencies   (~1-4 seconds depending on package size)
3. Executes your function               (varies)
4. Returns the response
5. Container stays "warm" for ~5 min, then shuts down
```

If the total exceeds Vercel's timeout (10 seconds default), you get a 504 FUNCTION_INVOCATION_TIMEOUT.

**What happened to us:**

Our first Gmail parsing approach imported the Anthropic SDK (`@anthropic-ai/sdk`), a large package. The timeline looked like:

| Step | Time | Running total |
|------|------|---------------|
| Container startup | ~1.5s | 1.5s |
| Load Anthropic SDK | ~3s | 4.5s |
| Gmail API calls | ~2s | 6.5s |
| Claude API call | ~6s | 12.5s |
| **Total** | | **12.5s > 10s limit = TIMEOUT** |

**How we fixed it:**

We eliminated the Claude API call entirely. The "Delivered:" email text is so structured that a simple regex parses it in milliseconds:

| Step | Time | Running total |
|------|------|---------------|
| Container startup | ~1s | 1s |
| Load code (no heavy SDK) | ~0.2s | 1.2s |
| Gmail API calls | ~2s | 3.2s |
| Regex parsing | ~0ms | 3.2s |
| **Total** | | **3.2s — well under any limit** |

**PM takeaway:** When evaluating whether to use AI for a feature, ask: "Is the data structured enough to parse without AI?" If yes, use code — it's faster, cheaper, and more reliable. Save AI for genuinely unstructured data (like analyzing a fridge photo). Our Gmail parsing went from $0.01/sync and 12+ seconds to $0/sync and 3 seconds by switching from Claude to regex.

---

## 14. Not Everything Needs AI (When to Use Code vs. Claude)

A key product judgment: **use AI for unstructured problems, use code for structured ones.**

| Task | Data type | Best approach | Why |
|------|-----------|--------------|-----|
| Analyze fridge photo | Unstructured (image) | Claude Vision API | Only AI can identify groceries in a photo |
| Parse Walmart email items | Structured text ("Item Name $X.XX Qty: N") | Regex | Pattern is consistent, regex is instant and free |
| Calculate cart total | Numbers | JavaScript math | AI would be slower and sometimes wrong |
| Search Gmail | API call | Gmail API | Don't need AI to call an API |

We originally used Claude to parse email HTML — it worked but was slow (8 seconds), expensive ($0.01/call), and caused timeouts. The "Delivered:" emails turned out to have perfectly structured text that regex handles in 0ms.

**PM lesson:** Before adding AI to a feature, look at the actual data. If it follows a pattern, code is better. If it's genuinely unpredictable (images, free-form text, ambiguous formats), that's where AI shines.

---

## 15. "Fill My Walmart Cart" (Firebase + Chrome Extension)

This is the most ambitious feature — it bridges the web app and the browser to automate cart filling.

**The problem:** After scanning your fridge, you get a restock list. But you still have to manually search each item on walmart.com and add it to your cart. With 10+ items, that's tedious.

**The solution:** One tap on "Fill My Walmart Cart" → a Chrome Extension automatically adds every item to your Walmart cart.

**Why this needs two pieces (PWA + Extension):**

| | PWA (fridgefill.vercel.app) | Chrome Extension |
|---|---|---|
| **Can do** | Show UI, call APIs, store data | Access browser tabs, modify walmart.com pages |
| **Can't do** | Touch other websites or browser tabs | Show a full app UI |
| **Role** | Sends the shopping list | Receives it and adds items to Walmart |

They communicate through **Firebase Firestore** — a real-time cloud database that both can read/write.

**How it works:**

```
1. User taps "Fill My Walmart Cart"
   → PWA signs user in with Google (Firebase Auth)

2. PWA writes to Firestore:
   { status: "pending", items: [{name: "Milk", qty: 2}, ...] }

3. Chrome Extension is listening for new requests
   → Detects the pending request instantly

4. Extension adds each item to Walmart cart:
   → First tries Walmart's internal API (fastest)
   → Falls back to DOM automation (clicks buttons on walmart.com)

5. After each item, Extension updates Firestore:
   { progress: { total: 10, added: 7, failed: 0 } }

6. PWA shows real-time progress bar
   → Updates live as each item is added
```

**Why Firebase?**

Firebase is Google's app platform. We use two parts:
- **Firestore** — a real-time database. When the Extension writes an update, the PWA sees it instantly (within ~100ms). No polling, no refresh needed.
- **Auth** — Google Sign-In. Same identity in both the PWA and Extension, so each user's cart requests are private.

**Security:** Firestore rules ensure users can only read/write their own cart requests. The Firebase API key in client code is normal — security comes from server-side rules, not key secrecy.

**PM takeaway:** This pattern (web app → shared database → browser extension) is reusable for any product that needs to bridge a web UI with browser automation. The key insight is that web apps and extensions can't talk directly — they need a shared database as the bridge. Firebase makes this easy because of real-time listeners.

---

## 16. Glossary of Terms Used

| Term | Plain English |
|------|--------------|
| **OAuth 2.0** | An industry standard for letting apps access your data on another service (like Gmail) without knowing your password. |
| **Access Token** | A temporary key that lets our app read your Gmail. Expires after ~1 hour. |
| **Refresh Token** | A longer-lived key that lets us get a new access token without making you log in again. |
| **Consent Screen** | The Google page that says "FridgeFill wants to read your Gmail. Allow?" |
| **Scope** | What permissions the app is requesting. We only ask for `gmail.readonly`. |
| **API** | A way for two programs to talk to each other. Our app talks to Claude's API to get fridge analysis. |
| **Base64** | A way to represent binary data (like an image) as text. Needed because JSON can only contain text. |
| **Component** | A reusable UI building block in React. Like a template for a button, card, or screen. |
| **Deploy** | Publishing code so users can access it on the internet. |
| **Endpoint** | A specific URL that accepts requests. `/api/analyze-fridge` is our endpoint. |
| **Environment variable** | A secret value (like an API key) stored on the server, not in code. |
| **Git** | Version control — tracks every change to your code with history. Like Google Docs version history. |
| **HEIC** | Apple's image format. More efficient than JPEG but not universally supported. |
| **JSON** | A structured text format for data. Like a spreadsheet in text form. |
| **JSX** | HTML-like syntax used in React to describe UI. Looks like HTML but lives in JavaScript files. |
| **MVP** | Minimum Viable Product — the smallest version that delivers core value. |
| **Node.js** | JavaScript runtime that lets you run JavaScript outside a browser (on a server). |
| **PWA** | Progressive Web App — a website that can be installed like a native app. |
| **Serverless** | Cloud functions that run on-demand, not on a dedicated server. Pay per use. |
| **Service Worker** | A script that runs in the background, enabling offline caching for PWAs. |
| **Tailwind** | A CSS framework where you style elements with utility classes like `bg-green-600`. |
| **Vite** | A fast build tool for modern web apps. Compiles your code for production. |
| **Chrome Extension** | A small program that runs inside Chrome and can interact with web pages. Ours automates adding items to Walmart's cart. |
| **Cold Start** | The delay when a serverless function starts up for the first time. Loading heavy packages makes it worse. |
| **DOM Automation** | Programmatically clicking buttons and filling forms on a web page, as if a human were doing it. |
| **Firebase** | Google's app development platform. We use Firestore (database) and Auth (login). |
| **Firestore** | A real-time NoSQL database. Changes sync instantly to all listeners — no polling needed. |
| **Regex** | Regular Expression — a pattern-matching syntax for finding/extracting text. Like Ctrl+F on steroids. |
| **504 Timeout** | Server took too long to respond. In serverless, means your function exceeded the time limit. |
| **MIME** | The format emails use internally. An email can have multiple "parts" (text, HTML, images) nested inside each other. |
| **Vercel** | A cloud platform for deploying web apps. Handles hosting, SSL, and serverless functions. |
