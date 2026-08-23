import { expect, test } from '@playwright/test';

const financingPanel = (page, heading) => page.locator('.finance-panel').filter({
  has: page.getByRole('heading', { name: heading, exact: true })
});

const metricCard = (panel, title) => panel.locator(`[data-metric-title="${title}"]`);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Økonomisk status' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Seksjon' })).toContainText('Alle seksjonar');
});

test('viser eit avgrensa finansdashbord utan import eller eksport', async ({ page }) => {
  await expect(page.getByLabel('Filter for dashbordet').getByText('NOK 1 000', { exact: true }))
    .toBeVisible();
  await expect(page.locator('.finance-panel')).toHaveCount(3);
  await expect(page.locator('.metric-card')).toHaveCount(9);
  await expect(page.getByRole('button', { name: /last opp/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /last ned/i })).toHaveCount(0);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
});

test('viser enkel kjeldestatus utan teknisk støy', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await expect(page.getByText(/\d{2}\.\d{2}\.\d{4}/).first()).toBeVisible();
  await expect(page.getByText('Siste bokførte transaksjon')).toBeVisible();
  await expect(page.getByText('Om data og versjon', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Teknisk periodestatus', { exact: true })).toHaveCount(0);
});

test('Evidence sitt periodefilter oppdaterer KPI-ane', async ({ page }) => {
  const panel = financingPanel(page, 'Driftsutgifter');
  const adkValue = metricCard(panel, 'ADK').locator('.big-number');

  const marchValue = await adkValue.textContent();
  await page.getByRole('button', { name: 'Jan–apr' }).click();
  await expect(page.locator('.hero-context')).toContainText('Januar–april');
  const aprilValue = await adkValue.textContent();
  await page.getByRole('button', { name: 'Jan–jun' }).click();
  await expect(page.locator('.hero-context')).toContainText('Januar–juni');
  const juneValue = await adkValue.textContent();

  expect(new Set([marchValue, aprilValue, juneValue]).size).toBe(3);
});

test('seksjonsfilteret brukar dimensjon C1 og endrar tala', async ({ page }) => {
  const panel = financingPanel(page, 'Driftsutgifter');
  const adkValue = metricCard(panel, 'ADK').locator('.big-number');
  const allSectionsValue = await adkValue.textContent();

  await page.getByRole('combobox', { name: 'Seksjon' }).click();
  await page.getByPlaceholder('Seksjon').fill('251');
  await page.getByText('251 · ØS - Økonomi og styring', { exact: true }).click();

  await expect(page.locator('.hero-context')).toContainText('251 · ØS - Økonomi og styring');
  await expect(adkValue).not.toHaveText(allSectionsValue ?? '');
  await expect(page.locator('.metric-card')).toHaveCount(9);
});

test('deler dei ni KPI-ane i eitt hovudområde og to sekundærområde', async ({ page }) => {
  await expect(financingPanel(page, 'Driftsutgifter').locator('.metric-card')).toHaveCount(5);
  await expect(financingPanel(page, 'Utstyr og vedlikehald').locator('.metric-card')).toHaveCount(1);
  await expect(financingPanel(page, 'Nytt nødnett').locator('.metric-card')).toHaveCount(3);
  await expect(page.locator('.budget-rail')).toHaveCount(8);
  await expect(page.locator('.dashboard-shell')).not.toHaveClass(/variant-/);
  await expect(page.getByRole('button', { name: /vis versjoner/i })).toHaveCount(0);
});

test('beheld leserekkefølgja på mobil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const headings = await page.locator('.panel-heading h2').allTextContents();
  expect(headings).toEqual(['Driftsutgifter', 'Utstyr og vedlikehald', 'Nytt nødnett']);
  await expect(page.getByRole('combobox', { name: 'Seksjon' })).toBeVisible();
  await expect(page.locator('.metric-card').first()).toBeVisible();
});
