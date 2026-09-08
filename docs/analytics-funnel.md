# Canonical Booking Funnel

F0 Entry → $pageview (PostHog+GA4)
F1 Intent CTA → blog_inline_cta_clicked (article_slug, cta_location)
F2 Discovery → search_started / related_lawyers_shown (specialty, article_slug)
F3 Lawyer Profile → lawyer_profile_viewed (GA4+PH, lawyer_id, article_slug, source=blog, cta_location)
F4 booking_page_viewed → GA4/PH (lawyer_id, source, article_slug, utm_*, is_test) — once per mount
F5 booking_started → GA4/PH (lawyer_id, service_id?, article_slug, source=booking_page|assistant, is_test) — once per interaction, on first service/date/time select
F6 begin_checkout → GA4/PH (booking_id, lawyer_id, service_id?, value, currency=CLP, article_slug, source, utm_*, is_test) — only after server booking+preference success
F7 paid → GA4 purchase (transaction_id=paymentId, value, currency, lawyer_id, service_id?, article_slug, utm_*, is_test) / PH booking_paid (same, server validated, distinct_id stable)

Dimensions:
- article_slug (blog → booking → paid, via URL+sessionStorage → booking.metadata → paid event)
- lawyer_id (canonical)
- service_id (service bookings)
- source (booking_page|assistant|blog|search)
- cta_location (inline|related_lawyers|sticky)
- is_test (true if @test.invalid or is_test param, filtered in dashboards)
- utm_source/medium/campaign (persisted via sessionStorage → booking.metadata → paid)
- localhost → no production conversion events (isLocalhost guard)

Legacy:
- continue_to_checkout → legacy diagnostic, not canonical F6
- booking_created (PH server) → operational, not CRO F6
- lawyer_profile_clicked (PH) → legacy, use lawyer_profile_viewed
