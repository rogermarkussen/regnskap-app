import { expect, test } from '@playwright/test';

const DATA_ROOT = process.env.REGNSKAP_COMMON_DATA_FOLDER;

const openWithCommonFolder = async (page, url) => {
  await page.goto(url);
  await expect(page.getByRole('heading', { name: 'Velg lokal datamappe' })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(DATA_ROOT);
};

test.describe('samme operative råmappe i alle oppgaver', () => {
  test.setTimeout(180_000);
  test.skip(!DATA_ROOT, 'Sett REGNSKAP_COMMON_DATA_FOLDER til mappen med de 12 råfilene');

  test('Oppgave 1 bygger KPI-er og kostnadssteder fra de 12 råfilene', async ({ page }) => {
    await openWithCommonFolder(page, 'http://127.0.0.1:3111/');
    await expect(page.getByRole('heading', { name: 'Økonomisk status' })).toBeVisible({ timeout: 120_000 });
    const options = page.getByRole('combobox', { name: 'Kostnadssted' }).locator('option');
    expect(await options.count()).toBeGreaterThan(5);
  });

  test('Oppgave 2 bygger kontogrupperingen fra de samme 12 råfilene', async ({ page }) => {
    await openWithCommonFolder(page, 'http://127.0.0.1:3112/');
    await expect(page.getByRole('heading', { name: 'Kontogruppering' })).toBeVisible({ timeout: 120_000 });
    const options = page.getByLabel('Seksjon / kostnadssted').locator('option');
    expect(await options.count()).toBeGreaterThan(5);
  });

  test('Oppgave 3 viser alle 23 seksjoner og ingen foreldet fakturakandidat', async ({ page }) => {
    await openWithCommonFolder(page, 'http://127.0.0.1:3113/');
    await expect(page.getByRole('heading', { name: 'Kontroller perioden før den lukkes' })).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText('23 seksjoner med rapportdata')).toBeVisible();
    await expect(page.getByText('0 til kontroll')).toBeVisible();
    await page.getByRole('button', { name: /Fakturaflyt/ }).click();
    await expect(page.getByRole('heading', { name: 'Finn fakturaene som trenger et blikk' })).toBeVisible({ timeout: 120_000 });
  });
});
