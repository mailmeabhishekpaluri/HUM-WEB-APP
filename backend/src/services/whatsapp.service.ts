// WhatsApp notifications via Meta Cloud API (WhatsApp Business Platform).
// Activates automatically once these env vars are set:
//   WHATSAPP_PHONE_NUMBER_ID  — the HUManity sender's phone-number ID
//   WHATSAPP_ACCESS_TOKEN     — permanent system-user access token
//   WHATSAPP_API_VERSION      — optional, defaults to v21.0
// Until configured, every call is a safe no-op so in-app + email keep working.

let warnedOnce = false;

function isConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
}

/** Normalise an Indian mobile to E.164 digits (no '+'), as Meta expects. */
function normalizeIndianNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;        // bare 10-digit → prefix 91
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits; // already has a country code of some form
}

/**
 * Send a plain-text WhatsApp message. Returns true if dispatched, false if
 * skipped (not configured / bad number) or failed. Never throws.
 */
export async function sendWhatsApp(to: string | null | undefined, message: string): Promise<boolean> {
  if (!to) return false;
  if (!isConfigured()) {
    if (!warnedOnce) {
      console.log('[WhatsApp] Not configured (set WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN to enable). Skipping sends.');
      warnedOnce = true;
    }
    return false;
  }
  const number = normalizeIndianNumber(to);
  if (!number) return false;

  const version = process.env.WHATSAPP_API_VERSION || 'v21.0';
  const url = `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: number,
        type: 'text',
        text: { preview_url: false, body: message },
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error(`[WhatsApp] send failed (${res.status}): ${detail}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[WhatsApp] send error:', err);
    return false;
  }
}
