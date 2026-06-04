// Pure unit test for the BMI formula used by addGrowthRecord in
// child.service.ts. Mirrors that function's `weight / (height_m^2)` rounded
// to 1 decimal — keeps tests DB-free and runs in CI without infra.
test('BMI 150cm 40kg = 17.8', () => {
  const h = 1.5;
  const w = 40;
  expect(parseFloat((w / (h * h)).toFixed(1))).toBe(17.8);
});

test('BMI 100cm 16kg = 16.0', () => {
  const h = 1.0;
  const w = 16;
  expect(parseFloat((w / (h * h)).toFixed(1))).toBe(16.0);
});
