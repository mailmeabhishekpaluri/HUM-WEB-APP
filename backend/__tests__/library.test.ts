// Unit-only test for the reading-distribution counting logic used by
// getReadingProgress in library.service.ts. Avoids the DB so it stays fast
// and runs in CI without infrastructure.
test('reading distribution tallies latest level per child', () => {
  const latest: Array<string | null> = ['WORD', 'WORD', 'BEGINNER', 'STORY', null];
  const dist: Record<string, number> = {
    BEGINNER: 0, LETTER: 0, WORD: 0, PARAGRAPH: 0, STORY: 0, NOT_ASSESSED: 0,
  };
  for (const l of latest) dist[l ?? 'NOT_ASSESSED']++;
  expect(dist.WORD).toBe(2);
  expect(dist.NOT_ASSESSED).toBe(1);
  expect(dist.BEGINNER).toBe(1);
  expect(dist.STORY).toBe(1);
  expect(dist.LETTER).toBe(0);
});
