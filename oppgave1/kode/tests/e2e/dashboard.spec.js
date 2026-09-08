import { expect, test } from '@playwright/test';

const financingPanel = (page, heading) => page.locator('.finance-panel').filter({
  has: page.getByRole('heading', { name: heading, exact: true })
});

const metricCard = (panel, title) => panel.locator(`[data-metric-title="${title}"]`);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Økonomisk status' })).toBeVisible();
});

test('viser eit avgrensa finansdashbord utan import eller eksport', async ({ page }) => {
  await expect(page.getByLabel('Filter for dashbordet').getByText('NOK 1 000', { exact: true }))
    .toBeVisible();
  await expect(page.locator('.finance-panel')).toHaveCount(3);
  await expect(page.locator('.metric-card')).toHaveCount(9);
  await expect(page.getByRole('button', { name: /last opp/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /last ned/i })).toHaveCount(0);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.locator('.eyebrow')).toHaveText('Finansiell styring');
  await expect(page.locator('.hero-context')).toHaveText('Alle kostnadssteder');
  await expect(page.locator('.hero-context')).not.toContainText(/20\d{2}/);
  await expect(page.getByRole('combobox', { name: 'Kostnadssted' })).toHaveCount(0);
  await expect(page.locator('.metric-value-row').getByText('NOK 1 000', { exact: true })).toHaveCount(0);
  await expect(page.locator('.panel-count')).toHaveCount(0);
});

test('viser enkel kjeldestatus utan teknisk støy', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await expect(page.getByText(/\d{2}\.\d{2}\.\d{4}/).first()).toBeVisible();
  await expect(page.getByText('Siste bokførte transaksjon')).toBeVisible();
  await expect(page.getByText('Om data og versjon', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Teknisk periodestatus', { exact: true })).toHaveCount(0);
});

test('rapportperioden bruker siste data som standard og oppdaterer KPI-ene', async ({ page }) => {
  const panel = financingPanel(page, 'Driftsutgifter');
  const adkValue = metricCard(panel, 'ADK').locator('.big-number');

  await expect(page.getByRole('combobox', { name: 'Rapportperiode' }))
    .toContainText('Siste tilgjengelige · juli 2026');
  const julyValue = await adkValue.textContent();

  await page.getByRole('combobox', { name: 'Rapportperiode' }).click();
  await page.getByText('April 2026', { exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Rapportperiode' })).toContainText('April 2026');
  await expect(adkValue).not.toHaveText(julyValue ?? '');
  const aprilValue = await adkValue.textContent();

  await page.getByRole('combobox', { name: 'Rapportperiode' }).click();
  await page.getByText('Juni 2026', { exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Rapportperiode' })).toContainText('Juni 2026');
  await expect(adkValue).not.toHaveText(aprilValue ?? '');
  const juneValue = await adkValue.textContent();

  expect(new Set([aprilValue, juneValue, julyValue]).size).toBe(3);
});

test('viser alltid tall for alle kostnadssteder', async ({ page }) => {
  await expect(page.getByRole('combobox', { name: 'Kostnadssted' })).toHaveCount(0);
  await expect(page.locator('.metric-card')).toHaveCount(9);
});

test('deler dei ni KPI-ane i eitt hovudområde og to sekundærområde', async ({ page }) => {
  await expect(financingPanel(page, 'Driftsutgifter').locator('.metric-card')).toHaveCount(5);
  await expect(financingPanel(page, 'Utstyr og vedlikehold').locator('.metric-card')).toHaveCount(1);
  await expect(financingPanel(page, 'Nytt nødnett').locator('.metric-card')).toHaveCount(3);
  await expect(page.locator('.budget-rail')).toHaveCount(6);
  await expect(page.locator('.ratio-visual')).toHaveCount(2);
  await expect(page.getByRole('img', { name: /Lønnsandel: \d+%/ })).toHaveCount(2);
  await expect(page.getByText('Øvrige kostnader', { exact: true })).toHaveCount(0);
  expect(await page.locator('.ratio-chart').first().evaluate((element) => element.clientWidth))
    .toBeGreaterThanOrEqual(140);
  await expect(page.locator('.dashboard-shell')).not.toHaveClass(/variant-/);
  await expect(page.getByRole('button', { name: /vis versjoner/i })).toHaveCount(0);
});

test('beheld leserekkefølgja på mobil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const headings = await page.locator('.panel-heading h2').allTextContents();
  expect(headings).toEqual(['Driftsutgifter', 'Utstyr og vedlikehold', 'Nytt nødnett']);
  await expect(page.getByRole('combobox', { name: 'Kostnadssted' })).toHaveCount(0);
  const periodPicker = page.getByRole('combobox', { name: 'Rapportperiode' });
  await expect(periodPicker).toBeVisible();
  expect(await periodPicker.evaluate((element) => getComputedStyle(element).overflowX)).toBe('hidden');
  await expect(page.locator('.metric-card').first()).toBeVisible();
});
