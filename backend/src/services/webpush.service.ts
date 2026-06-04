// Web Push notifications. Safe no-op until VAPID env is set:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (e.g. mailto:ops@…)
// Real send would use the `web-push` npm package; stubbed for now per the
// brief ("if this balloons scope, stub the model + service with a TODO and
// move on — do NOT block the rest").

import { prisma } from '../lib/prisma';

let warnedOnce = false;
function isConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

/** Persist a Web Push subscription for a user. */
export async function saveSubscription(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
}

/** Best-effort push to all of a user's subscriptions; never throws. */
export async function sendPush(userId: string, title: string, body: string, url?: string): Promise<void> {
  if (!isConfigured()) {
    if (!warnedOnce) {
      console.log('[WebPush] Not configured (set VAPID_* env to enable). Skipping push sends.');
      warnedOnce = true;
    }
    return;
  }
  // TODO: real implementation
  //   const webpush = await import('web-push');
  //   webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  //   const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  //   await Promise.all(subs.map(s => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title, body, url }))
  //     .catch(err => { if (err.statusCode === 410) prisma.pushSubscription.delete({ where: { endpoint: s.endpoint } }); })));
  void userId; void title; void body; void url;
}
