# GA4 Events Documentation

## Obsolete Events (Deprecated)

### `view_lawyers`
- **Status:** ❌ OBSOLETE
- **Date Removed:** June 17, 2026 (commit 9735fae)
- **Originally Added:** April 27, 2026 (commit 987a42f)
- **Original Location:** `src/pages/SearchResults.tsx`
- **Reason for Removal:** Event was removed during funnel refactoring
- **Replacement:** None - this event is no longer tracked
- **Historical Data:** Events before June 17, 2026 may still appear in GA4

### `booking_start`
- **Status:** ❌ OBSOLETE
- **Date Renamed:** June 17, 2026 (commit 9735fae)
- **Originally Added:** December 28, 2025 (commit 760272a)
- **Original Location:** `src/pages/BookingPage.tsx`
- **Reason for Removal:** Renamed to `booking_page_viewed` with better deduplication logic
- **Replacement:** `booking_page_viewed`
- **Historical Data:** Events before June 17, 2026 may still appear in GA4

---

## Current GA4 Events (Active)

### Funnel Events

#### `lawyer_profile_viewed`
- **Location:** `src/components/LawyerCard.tsx`
- **Trigger:** User clicks on a lawyer card to view profile
- **Parameters:** `lawyer_id`, `lawyer_name`
- **Deduplication:** None (needs guard)
- **Status:** ⚠️ Needs improvement

#### `booking_page_viewed`
- **Location:** `src/pages/BookingPage.tsx`
- **Trigger:** User lands on booking page with lawyer data loaded
- **Parameters:** `lawyer_id`, `lawyer_name`
- **Deduplication:** ✅ useRef guard
- **Status:** ✅ Correct

#### `date_selected`
- **Location:** `src/pages/BookingPage.tsx`
- **Trigger:** User selects a date in the calendar
- **Parameters:** `lawyer_id`, `selected_date`
- **Deduplication:** ✅ User action only
- **Status:** ✅ Correct

#### `time_selected`
- **Location:** `src/pages/BookingPage.tsx`
- **Trigger:** User selects an available time slot
- **Parameters:** `lawyer_id`, `selected_date`, `selected_time`
- **Deduplication:** ✅ User action only
- **Status:** ✅ Correct

#### `continue_to_checkout`
- **Location:** `src/pages/BookingPage.tsx`
- **Trigger:** User clicks "Continuar al pago" button
- **Parameters:** `lawyer_id`, `duration`, `price`
- **Deduplication:** ✅ User action only
- **Status:** ✅ Correct

#### `lead_created`
- **Location:** `src/pages/BookingPage.tsx`, `src/components/PreCheckoutModal.tsx`
- **Trigger:** After successful booking creation on server
- **Parameters:** `lawyer_id`, `duration`, `price`
- **Deduplication:** ✅ Server response only
- **Status:** ✅ Correct

#### `begin_checkout`
- **Location:** `src/pages/BookingPage.tsx`, `src/components/PreCheckoutModal.tsx`
- **Trigger:** After server returns valid payment_link, before redirect to Mercado Pago
- **Parameters:** `booking_id`, `value`, `currency`, `items`
- **Deduplication:** ✅ Server response only
- **Status:** ✅ Correct

#### `purchase`
- **Location:** `src/pages/BookingSuccessPage.tsx`, `server.mjs` (Measurement Protocol)
- **Trigger:** After Mercado Pago confirms payment
- **Parameters:** `transaction_id`, `booking_id`, `value`, `currency`, `items`
- **Deduplication:** ✅ useRef guard (frontend), server-side (backend)
- **Status:** ✅ Correct

---

## Current Funnel Flow

```
lawyer_profile_viewed
    ↓
booking_page_viewed
    ↓
date_selected
    ↓
time_selected
    ↓
continue_to_checkout
    ↓
lead_created
    ↓
begin_checkout
    ↓
purchase
```

---

## Landing Page Events

### `view_*_landing`
- **Locations:** Various landing pages (DivorcioUnilateralLanding, PensionAlimentosLanding, etc.)
- **Trigger:** Page load
- **Parameters:** None
- **Deduplication:** ⚠️ Needs sessionStorage guard
- **Status:** ⚠️ Needs improvement

### `click_cta_hero_*`
- **Locations:** Landing pages
- **Trigger:** User clicks hero CTA button
- **Parameters:** None
- **Deduplication:** ✅ User action only
- **Status:** ✅ Correct

---

## Blog Events

### `click_consultar_abogado`
- **Location:** Blog articles
- **Trigger:** User clicks CTA button in blog post
- **Parameters:** `article`, `location`
- **Deduplication:** ✅ User action only
- **Status:** ✅ Correct

### `search_started`
- **Location:** Various CTAs (HowItWorksPage, CategoryLanding, blog posts)
- **Trigger:** User clicks "Buscar abogados" button
- **Parameters:** None
- **Deduplication:** ✅ User action only
- **Status:** ✅ Correct

---

## Auth Events

### `sign_up`
- **Location:** `src/contexts/AuthContext/clean/AuthContext.tsx`
- **Trigger:** User completes signup
- **Parameters:** `method`, `role`, `status`
- **Deduplication:** ✅ Server response only
- **Status:** ✅ Correct

---

## Technical Implementation

### Page Views
- **Implementation:** Automatic via `ReactGA.send({ hitType: "pageview", ... })`
- **Component:** `src/components/GoogleAnalytics.tsx`
- **Trigger:** Route changes via `useLocation` hook
- **Status:** ✅ Correct

### Server-Side Events
- **Implementation:** GA4 Measurement Protocol
- **Location:** `server.mjs` (sendGA4PurchaseEvent)
- **Events:** `purchase` only
- **Status:** ✅ Correct

---

## Environment Variables

- **Frontend GA4:** `VITE_GA_MEASUREMENT_ID`
- **Backend GA4:** `GA4_MEASUREMENT_ID`, `GA4_API_SECRET`

---

## Notes

- React Strict Mode is enabled in `src/main.tsx`
- All critical funnel events have deduplication guards
- Historical data in GA4 may include obsolete events from before June 17, 2026
- PostHog and TikTok Pixel are also implemented but do not send GA4 events
