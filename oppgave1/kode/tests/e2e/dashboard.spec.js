import { expect, test } from '@playwright/test';

const financingPanel = (page, heading) => page.locator('.finance-panel').filter({
  has: page.getByRole('heading', { name: heading, exact: true })
});

const metricCard = (panel, title) => panel.locator(`[data-metric-title="${title}"]`);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Økonomisk status' })).toBeVisible();
});

test('viser bare operative KPI-er uten import, eksport eller detaljgrunnlag', async ({ page }) => {
  await expect(page.getByText('Regnskap mot budsjett for tre finansieringer, samlet i ett styringsbilde.')).toHaveCount(0);
  await expect(page.getByText(/Beregnet fra operative hovedbok- og budsjettdata/)).toHaveCount(0);
  await expect(page.getByText('NOK 1 000', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /last opp/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /last ned/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /vis grunnlag/i })).toHaveCount(0);
  await expect(page.getByText(/syntetisk demo/i)).toHaveCount(0);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
});

test('viser enkel oppdateringsdato uten tekniske detaljer', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await expect(page.getByText(/Regnskap oppdatert til \d{2}\.\d{2}\.\d{4}/)).toBeVisible();
  await expect(page.getByText('Om data og versjon', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Datasett-ID', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Teknisk periodestatus', { exact: true })).toHaveCount(0);
});

test('periodevalgene oppdaterer KPI-ene', async ({ page }) => {
  const panel = financingPanel(page, 'Driftsutgifter (154301)');
  const adkValue = metricCard(panel, 'ADK').locator('.big-number');

  await page.getByRole('button', { name: 'Jan–mar' }).click();
  const marchValue = await adkValue.textContent();
  await page.getByRole('button', { name: 'Jan–apr' }).click();
  const aprilValue = await adkValue.textContent();
  await page.getByRole('button', { name: 'Jan–jun' }).click();
  const juneValue = await adkValue.textContent();

  expect(new Set([marchValue, aprilValue, juneValue]).size).toBe(3);
});

test('viser ni KPI-kort fordelt på tre finansieringer', async ({ page }) => {
  await expect(page.locator('.finance-panel')).toHaveCount(3);
  await expect(page.locator('.metric-card')).toHaveCount(9);
  await expect(page.getByRole('heading', { name: 'Driftsutgifter (154301)' })).toBeVisible();
  await expect(page.getByRole('heading', {
    name: 'Større utstyrsanskaffelser og vedlikehold (154345)'
  })).toBeVisible();
  await expect(page.getByRole('heading', {
    name: 'Nytt nødnett inkl. innleide konsulenter (154322/045101)'
  })).toBeVisible();
});

test('kan sammenligne fem presentasjonsversjoner uten å endre tallene', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const firstValue = await page.locator('.metric-card .big-number').first().textContent();
  const panelBoxes = async () => Promise.all(
    [0, 1, 2].map((index) => page.locator('.finance-panel').nth(index).boundingBox())
  );

  await page.getByRole('button', { name: 'Vis versjoner' }).click();
  await expect(page.getByRole('region', { name: 'Presentasjonsversjoner' })).toBeVisible();
  await expect(page.locator('.variant-options button')).toHaveCount(5);

  await page.getByRole('button', { name: /1 · Tre kolonner/ }).click();
  await expect(page.locator('.metric-card.card')).toHaveCount(9);
  await expect(page.locator('.metric-card.card .progress').first()).toBeVisible();
  const columns = await panelBoxes();
  expect(Math.abs(columns[0].y - columns[1].y)).toBeLessThan(5);
  expect(columns[1].x).toBeGreaterThan(columns[0].x);
  expect(columns[2].x).toBeGreaterThan(columns[1].x);

  await page.getByRole('button', { name: /2 · Finansieringsrader/ }).click();
  await expect(page.locator('.metric-card.row')).toHaveCount(9);
  await expect(page.locator('.row-chart')).toHaveCount(9);
  const rows = await panelBoxes();
  expect(Math.abs(rows[0].x - rows[1].x)).toBeLessThan(5);
  expect(rows[1].y).toBeGreaterThan(rows[0].y);
  expect(rows[2].y).toBeGreaterThan(rows[1].y);

  await page.getByRole('button', { name: /3 · Hovedfokus/ }).click();
  await expect(page.locator('.metric-card.focus')).toHaveCount(9);
  await expect(page.locator('.donut')).toHaveCount(9);
  const focus = await panelBoxes();
  expect(focus[1].x).toBeGreaterThan(focus[0].x);
  expect(Math.abs(focus[1].x - focus[2].x)).toBeLessThan(5);
  expect(focus[2].y).toBeGreaterThan(focus[1].y);

  await page.getByRole('button', { name: /4 · Kontrollpanel/ }).click();
  await expect(page.locator('.metric-card.table-row')).toHaveCount(9);
  await expect(page.locator('.microbar')).toHaveCount(9);
  const controls = await page.locator('.dashboard-controls').boundingBox();
  const finance = await page.locator('.finance-grid').boundingBox();
  expect(finance.x).toBeGreaterThan(controls.x + controls.width);

  await page.getByRole('button', { name: /5 · Møtevisning/ }).click();
  await expect(page.locator('.metric-card.stage')).toHaveCount(9);
  await expect(page.locator('.stage-chart')).toHaveCount(9);
  const meeting = await panelBoxes();
  expect(meeting[0].width).toBeGreaterThan(meeting[1].width * 1.5);
  expect(Math.abs(meeting[1].y - meeting[2].y)).toBeLessThan(5);
  expect(meeting[2].x).toBeGreaterThan(meeting[1].x);

  await expect(page.locator('.dashboard-shell')).toHaveClass(/variant-v5/);
  await expect(page.locator('.metric-card .big-number').first()).toHaveText(firstValue ?? '');
});

test('bruker hovedfokus som standard, men beholder alle fem versjonene', async ({ page }) => {
  await expect(page.locator('.dashboard-shell')).toHaveClass(/variant-v3/);
  await expect(page.getByRole('region', { name: 'Slik leses hovedfokusvisningen' })).toBeVisible();
  await expect(page.getByText('Andre driftskostnader').first()).toBeVisible();
  await expect(page.getByText('Ringen viser brukt andel av budsjettet. For prosenttall viser den beregnet andel.')).toBeVisible();
  await expect(page.getByText('Nær budsjett', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Vis versjoner' }).click();
  await expect(page.locator('.variant-options button')).toHaveCount(5);
});
