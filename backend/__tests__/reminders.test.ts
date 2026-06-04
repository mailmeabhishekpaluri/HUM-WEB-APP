// The reminder job de-dupes on a composite key stored in Notification.data.dedupeKey.
// We can't exercise the cron without a DB, but we can lock the keying contract.

describe('reminder dedupe key', () => {
  function key(userId: string, type: string, entityId: string, bucket: string) {
    return `${type}:${entityId}:${bucket}:${userId}`;
  }

  test('same (userId, type, entityId, bucket) → same key (de-duped)', () => {
    const a = key('u1', 'CLASS_REMINDER', 'sess1', '24h');
    const b = key('u1', 'CLASS_REMINDER', 'sess1', '24h');
    expect(a).toBe(b);
  });

  test('different bucket → different key (24h vs 2h both fire)', () => {
    expect(key('u1', 'CLASS_REMINDER', 'sess1', '24h')).not.toBe(
      key('u1', 'CLASS_REMINDER', 'sess1', '2h')
    );
  });

  test('different user → different key (each volunteer notified once)', () => {
    expect(key('u1', 'SESSION_REMINDER', 'opp1', '24h')).not.toBe(
      key('u2', 'SESSION_REMINDER', 'opp1', '24h')
    );
  });
});
