import crypto from 'crypto';

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_PIXEL_ID = process.env.META_PIXEL_ID;
const META_API_VERSION = 'v21.0';

export function isMetaConfigured() {
  return !!(META_ACCESS_TOKEN && META_PIXEL_ID);
}

function sha256Hex(value) {
  return crypto
    .createHash('sha256')
    .update(String(value).trim().toLowerCase())
    .digest('hex');
}

export async function sendMetaPurchaseEvent({
  eventId,
  value,
  currency,
  email,
  itemName,
  userAgent,
  ipAddress,
}) {
  if (!isMetaConfigured()) {
    console.warn('[Meta CAPI] META_ACCESS_TOKEN or META_PIXEL_ID not configured — skipping Purchase event');
    return { skipped: true };
  }

  try {
    const userData = {};
    if (email) userData.em = [sha256Hex(email)];
    if (userAgent) userData.client_user_agent = String(userAgent).slice(0, 500);
    if (ipAddress) userData.client_ip_address = ipAddress;

    const payload = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: 'website',
          user_data: userData,
          custom_data: {
            value,
            currency: 'CLP',
            transaction_id: eventId,
            content_type: 'product',
            content_ids: [eventId],
            content_name: itemName || 'Documento Legal',
          },
        },
      ],
    };

    const url = `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, access_token: META_ACCESS_TOKEN }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Meta CAPI] Purchase event failed', { status: response.status, error: errorText });
      return { ok: false, status: response.status };
    }

    const result = await response.json();
    console.log('[Meta CAPI] Purchase event sent', { eventId, value, eventsReceived: result?.events_received });
    return { ok: true };
  } catch (error) {
    console.error('[Meta CAPI] Purchase event error', error);
    return { ok: false, error };
  }
}