# CLAUDE.md — FridgeFill Shopper Chrome Extension

## Project Overview
Chrome Extension that reads a grocery shopping list from the FridgeFill PWA (via Firebase Firestore) and automatically adds those items to the user's Walmart cart on walmart.com. This is a personal-use tool, not for public distribution.

## Architecture

```
FridgeFill PWA (React) → Firebase Firestore → Chrome Extension → walmart.com
                        ← real-time progress updates ←
```

- **FridgeFill PWA**: Writes cart requests to Firestore when user taps "Fill My Walmart Cart"
- **Firebase Firestore**: Shared real-time database holding cart requests, items, and status
- **Chrome Extension (Manifest V3)**: Listens for new cart requests, automates walmart.com to add items, writes progress back to Firestore
- **Auth**: Google Sign-In via Firebase Auth, shared across PWA and extension using the same Firebase project

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Firebase project setup | DONE | Project: `fridgefill-shopper` |
| Firestore Database | DONE | Standard edition, security rules published |
| Firebase Auth (Google) | DONE | Google sign-in enabled |
| Chrome OAuth client | DONE | Extension ID: `lldlalpbihnnhgkbhellicbdjofbnnae` |
| PWA: `src/lib/firebase.js` | DONE | Firebase init with Firestore + Auth |
| PWA: `src/lib/cartService.js` | DONE | `sendCartRequest` + `watchCartRequest` |
| PWA: `src/components/FillCartButton.jsx` | DONE | Full state machine with progress UI |
| PWA: ResultsScreen integration | DONE | Button wired into bottom bar |
| Extension: manifest.json | DONE | Manifest V3, permissions scoped |
| Extension: background.js | DONE | Firestore listener + Walmart API + content script fallback |
| Extension: content.js | DONE | DOM automation on walmart.com |
| Extension: popup.html/js/css | DONE | Auth status + progress UI |
| Extension: webpack build | DONE | 3 entry points bundled to dist/ |
| Firestore security rules | DONE | Users can only access own cart_requests |
| Security audit | DONE | Debug logs stripped, permissions tightened |
| Vercel deployment | DONE | Live at fridgefill.vercel.app |
| Authorized domains | DONE | fridgefill.vercel.app added to Firebase Auth |

## Tech Stack
- Firebase (Firestore + Auth) — JS SDK v10+
- Chrome Extension Manifest V3
- Webpack 5 (to bundle Firebase SDK for extension service worker)
- Vanilla JS for extension (no React needed inside the extension)
- React for FridgeFill PWA

## Firebase Config
- Project ID: `fridgefill-shopper`
- Auth Domain: `fridgefill-shopper.firebaseapp.com`
- Storage Bucket: `fridgefill-shopper.firebasestorage.app`
- Messaging Sender ID: `148402498640`
- Enabled: Firestore Database (Standard), Authentication (Google provider)
- Authorized domains: localhost, fridgefill.vercel.app
- Chrome OAuth Client ID: `148402498640-rnnll9cfdu2jsm4tfuqgg0vhl6j0mab1.apps.googleusercontent.com`

## Firestore Security Rules (Published)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/cart_requests/{requestId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Firestore Schema

```
users/{userId}/cart_requests/{requestId}
  status: "pending" | "in_progress" | "completed" | "failed"
  created_at: timestamp
  items: [
    {
      name: string            // "Great Value Whole Milk 1 Gal"
      quantity: number         // 1
      walmart_query: string    // "great value whole milk gallon"
      walmart_product_id: string | null
      status: "pending" | "added" | "not_found" | "failed"
    }
  ]
  progress: { total: number, added: number, failed: number }
```

## File Structure

### PWA (in fridgefill/)
```
src/
├── lib/
│   ├── firebase.js         ← Firebase init with Firestore + Auth exports
│   └── cartService.js      ← sendCartRequest() + watchCartRequest()
└── components/
    ├── FillCartButton.jsx   ← "Fill My Walmart Cart" button with progress states
    └── ResultsScreen.jsx    ← Integrates FillCartButton in bottom bar
```

### Chrome Extension (in fridgefill-extension/)
```
fridgefill-extension/
├── src/
│   ├── background.js       ← Firestore listener + Walmart API cart addition + content script fallback
│   ├── content.js           ← DOM automation on walmart.com (fallback)
│   ├── popup.js             ← Popup UI logic + auth
│   └── firebase.js          ← Firebase init + chrome.identity auth
├── dist/                    ← Webpack output (background.js, content.js, popup.js)
├── popup.html               ← Extension popup UI
├── popup.css                ← Popup styles (320px, green branding)
├── manifest.json            ← Manifest V3
├── webpack.config.js        ← 3 entry points → dist/
├── package.json
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## How It Works (E2E Flow)

1. User scans fridge on **fridgefill.vercel.app**
2. AI generates restock list on Results screen
3. User taps **"Fill My Walmart Cart"** button
4. PWA signs user in via Google (Firebase Auth popup)
5. PWA writes a cart request to Firestore with status `"pending"`
6. Chrome Extension detects new pending request via Firestore listener
7. Extension updates status to `"in_progress"`
8. For each item, extension tries:
   - **API approach**: Walmart autocomplete search → add to cart API
   - **Fallback**: Content script DOM automation on walmart.com tab
9. After each item, extension updates Firestore with item status + progress
10. PWA shows real-time progress via Firestore listener
11. When all items processed, status set to `"completed"` or `"failed"`

## Setup Requirements
- User must be logged into **walmart.com** in Chrome
- User must enable **Chrome sign-in** (Settings > You and Google > Allow Chrome sign-in)
- **FridgeFill Extension** must be loaded and signed in (via popup)
- Same Google account used in both PWA and extension

## Coding Guidelines
- Use async/await everywhere, no raw promises
- All Firestore operations in try/catch with meaningful error messages
- Extension service worker must handle being terminated and restarted by Chrome
- Content script selectors will break when Walmart updates their site — use data-testid attributes where available, fallback to aria-labels
- Add 2-3 second delays between adding items to avoid triggering rate limits
- Never log sensitive data (emails, API responses, tokens) in production
- Never store Walmart credentials — rely on the user's existing browser session

## Testing
- Test with 1 item first, then 5, then 10+
- Test error cases: walmart logged out, item not found, network failure
- Verify Firestore security rules block cross-user access
- Verify progress updates appear in real-time in FridgeFill PWA

## Important Notes
- Walmart internal API endpoints are reverse-engineered and may change
- DOM selectors on walmart.com will change periodically — expect maintenance
- This is a personal tool, not for public distribution (Walmart TOS)
- The user must be logged into walmart.com in Chrome for the extension to work
- Firebase API keys in client code are normal — security comes from Firestore rules
