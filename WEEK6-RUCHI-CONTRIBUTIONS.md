# Week 6: Ruchi, UI/Basic Math Contributions

This document summarizes UI work, expense flows, and client-side balance logic contributed for the **Endetted** group expense app (React frontend + Express/Firestore backend).

---

## Screenshot (group dashboard)

### Profile (`Profile.jsx`)

- **Username** display (Firestore / API with Firebase `displayName` fallback).
- **Change username** with backend **uniqueness** checks and sync to Auth + Firestore.
- **Change password** using Firebase **re-authentication** and **`updatePassword`**.

### Group trip dashboard (`GroupDetails.jsx`)

- **Header:** trip name, back to **my groups**.
- **Members:** single horizontal row (**Members:** names with `|` separators, **+ Add member**); **You** listed first; names use the **blue / green / yellow** palette.
- **Add member modal:** search by username; clear errors when **no user found** or network issues; refresh members after add.
- **Balances card:** two **side-by-side columns** (responsive grid):
  - **You owe:** total + **Per person** list (name + `$amount`).
  - **You are owed:** same structure.
  - Short helper text explains **total on top, breakdown below**.
  - Accent **top border** on each column (blue vs mint) for quick scanning.
- **Balance math (client-side):** For each expense, **share = amount / |splitBetween|**; every splitter except **`paidBy`** owes their share to the **payer**. Pairwise debts are **netted** so each person appears in at most one column with a **net** amount. Expenses **without** `splitBetween` fall back to **all current group members** for legacy data.
- **Recent activity:** up to **five** items; **paid by** drives the colored name; copy uses **“paid for {purpose}”**; amount **bold**; meta text **muted**.
- **Add expense:** full-screen modal with:
  - **Paid by** and **Split between** as **chip buttons** (`+` / `✓`), same row; **Paid by** is single-select; **Split between** is multi-select (at least one).
  - **Amount** and **purpose** on **one row** (amount fixed width, purpose flexible).
  - **Cancel** as **plain red text** (no button box); **Save** uses primary styling.
- **Action row:** **+ Add expense** matches the **teal outline / ice** style of **+ Add member**; three buttons in one row: **View Group Expenses** (blue), **Personal Tracking** (mint), **Settlements** (yellow, dark label text)—**no gradients**, solid fills aligned with the group palette.

### ESLint / React

- Removed unused default **`React`** imports where the JSX runtime allows.
- **Data-fetching effects** use an **`ignore` flag** pattern to avoid invalid hook patterns around `setState` in effects.

---

## Backend

### Users (`backend/routes/users.js`)

- **`GET /api/users/me`** — profile fields (e.g. username) for the authenticated user.
- **`POST /register`** — trimmed username, **Firestore uniqueness** (`usernameLower`), sets Auth **`displayName`**.
- **`PATCH /api/users/me/username`** — update username with uniqueness and Auth/Firestore sync.

### Groups (`backend/routes/groups.js`)

- **`GET /:id/members`** — member list with robust **`displayName`** (Firestore + Auth + email fallbacks).
- **`GET /:id/expenses`** — expenses ordered by **`createdAt`**.
- **`POST /:id/expenses`** — body: **`amount`**, **`purpose`**, **`paidBy`** (must be a group member; defaults to caller if omitted), **`splitBetween`** (non-empty array of member ids, deduped). Stores **`addedBy`** (who submitted), **`paidBy`**, **`splitBetween`**, and timestamp. Returns JSON without raw Firestore sentinel objects in the response payload.

### Security / repo hygiene

- **`.gitignore`** updated so **Firebase service account keys** (e.g. `**/serviceAccountKey.json`) are not committed. Collaborators still need their own key locally to run the backend.

---

## How to run (local)

1. **Backend:** place a valid **`serviceAccountKey.json`** under `backend/` (from Firebase Console), install deps, start the API (e.g. port **5001** as used in the frontend `fetch` URLs).
2. **Frontend:** install deps, **`npm run dev`** (Vite; note the printed port if another dev server is already running).

---

## Files touched (representative)

| Area | Files |
|------|--------|
| Groups UI & math | `frontend/src/pages/GroupDetails.jsx`, `frontend/src/pages/MyGroups.jsx` |
| Profile | `frontend/src/pages/Profile.jsx` |
| Routing | `frontend/src/App.jsx` |
| Theme / blocks | `frontend/src/index.css` |
| Navbar | `frontend/src/components/Navbar.jsx` |
| API | `backend/routes/groups.js`, `backend/routes/users.js` |
| Hygiene | `.gitignore` |

---

## Flaws, limitations, and what still needs work

### Flaws and limitations

- **Balances are computed only in the browser.** The API does not return or verify net balances; if the split rules ever change, old clients could disagree with new logic until refreshed.
- **Splits are equal-share only.** There is no support for unequal shares, percentages, “paid by X for Y only,” or itemized lines—everything assumes **amount ÷ number of people in `splitBetween`**.
- **Legacy expenses without `splitBetween`** are interpreted as split across **all current group members**, which may not match how the expense was originally meant; there is no way to edit past expenses to fix that.
- **`localhost:5001` is hardcoded** in frontend `fetch` calls. Deploying or running on another host/port requires code or env changes; there is no central API base URL config.
- **My groups + `localStorage` cache** can briefly disagree with the server (e.g. after another device adds a group) until the next successful fetch.
- **Recent activity shows only five items** on the dashboard; there is no dedicated full history screen wired to the same data yet (**View Group Expenses** is not implemented).
- **Floating-point rounding:** amounts are rounded for display and per-row breakdowns; tiny cent drift is possible across many expenses (acceptable for a prototype, worth hardening for money-grade apps).
- **No automated tests** for balance math, expense validation, or critical API routes.

### Needs improvement (UX and robustness)

- **Loading and error states** are minimal on some screens; failed loads sometimes only surface in the console.
- **Accessibility:** focus traps, `aria` labels, and keyboard flow in modals could be audited (partial work only).
- **Mobile layout:** the members row and three-button row work but could use tighter breakpoints and touch targets where needed.
- **Profile / auth edge cases:** session expiry, token refresh messaging, and offline behavior are not fully polished.
- **One-time data hygiene:** a scripted backfill (e.g. Auth `displayName` from Firestore `username` for old accounts) was discussed but not fully operationalized; run only with backup and a clear plan.

### Still to add (features and follow-ups)

- **View Group Expenses:** full list (all activity), filters, or export—not just the five-line preview.
- **Personal tracking:** user-scoped view or notes (button is a placeholder).
- **Settlements:** record “A paid B $X” (or suggested minimal transfers) and fold settlements into balance math so the dashboard reflects real-world payments.
- **Edit / delete expenses** and optional **audit trail** (`addedBy` exists but is not surfaced much in UI).
- **Server-side balance or validation** (optional): compute or verify nets in the API so web and any future mobile client share one source of truth.
- **Environment-based config** (`VITE_API_URL`, etc.) and deployment docs.
- **Security review** of Firestore rules and JWT usage beyond the current Express middleware.

---

*Prepared as Week 6 documentation for Ruchi’s UI and basic balance contributions.*
