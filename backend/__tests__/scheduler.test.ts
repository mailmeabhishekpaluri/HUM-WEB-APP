import { computeSessionDates } from '../src/services/scheduling.service';

describe('scheduling.computeSessionDates', () => {
  test('WEEKLY_MWF produces Mon/Wed/Fri only', () => {
    const start = new Date('2026-06-01T00:00:00+05:30'); // Mon
    const until = new Date('2026-06-15T00:00:00+05:30');
    const dates = computeSessionDates(
      { cadence: 'WEEKLY_MWF', startDate: start, defaultStartTime: '17:00' },
      until,
    );
    // 2 weeks of MWF = 6 sessions
    expect(dates.length).toBe(6);
    for (const d of dates) {
      const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
      // 1=Mon, 3=Wed, 5=Fri (UTC day on IST-shifted instant)
      expect([1, 3, 5]).toContain(ist.getUTCDay());
    }
  });

  test('ALTERNATE_SUNDAY skips every other Sunday', () => {
    const start = new Date('2026-06-07T00:00:00+05:30'); // a Sunday
    const until = new Date('2026-07-31T00:00:00+05:30');
    const dates = computeSessionDates(
      { cadence: 'ALTERNATE_SUNDAY', startDate: start, defaultStartTime: '10:00' },
      until,
    );
    // Jun 7, 21; Jul 5, 19 → 4 sessions
    expect(dates.length).toBe(4);
    // All must be Sundays
    for (const d of dates) {
      const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
      expect(ist.getUTCDay()).toBe(0);
    }
    // 14-day gaps
    for (let i = 1; i < dates.length; i++) {
      const gap = (dates[i].getTime() - dates[i - 1].getTime()) / (24 * 60 * 60 * 1000);
      expect(gap).toBe(14);
    }
  });

  test('QUARTERLY steps 3 months from startDate', () => {
    const start = new Date('2026-06-15T00:00:00+05:30');
    const until = new Date('2027-04-01T00:00:00+05:30');
    const dates = computeSessionDates(
      { cadence: 'QUARTERLY', startDate: start, defaultStartTime: '10:00' },
      until,
    );
    // Jun, Sep, Dec, Mar → 4
    expect(dates.length).toBe(4);
  });
});
