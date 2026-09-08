# Canonical Booking Funnel

F0 Entry → $pageview (PostHog+GA4)
F1 Intent CTA → blog_inline_cta_clicked
F2 Discovery → search_started / related_lawyers_shown
F3 Lawyer Profile → lawyer_profile_viewed (GA4) / lawyer_profile_clicked (PostHog)
F4 booking_page_viewed → GA4 booking_page_viewed / PH booking_page_viewed
F5 booking_started → GA4 booking_started / PH booking_started (once per booking-page interaction, on first service/date/time select, source=booking_page|assistant)
F6 begin_checkout → GA4 begin_checkout / PH begin_checkout (only after server creates booking + MP preference, requires booking_id, value, currency=CLP)
F7 paid → GA4 purchase (transaction_id=paymentId) / PH booking_paid (server validated)

Legacy:
- continue_to_checkout → legacy diagnostic, not canonical F6
- booking_created (PH server) → operational, not CRO F6
