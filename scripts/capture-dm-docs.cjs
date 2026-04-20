const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'screenshots', 'dm');
const APP_URL = process.env.DM_DOCS_URL || 'http://127.0.0.1:5174/dm';
const PASSWORD = process.env.DM_DOCS_PASSWORD || 'brother';
const CHROME_PATH =
  process.env.DM_DOCS_BROWSER ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const views = [
  { id: 'cases', file: '01-cases.png', label: 'Casos' },
  { id: 'pois', file: '02-pois.png', label: 'POIs' },
  { id: 'villains', file: '03-villains.png', label: 'Villanos' },
  { id: 'evidence', file: '04-evidence.png', label: 'Evidencias' },
  { id: 'tracer', file: '05-tracer.png', label: 'Tracer' },
  { id: 'access', file: '06-access.png', label: 'Accesos' },
  { id: 'campaign', file: '07-campaign.png', label: 'Campaña' },
];

async function waitForStableView(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(700);
}

async function collectVisibleMeta(page) {
  return await page.evaluate(() => {
    const byText = (selector) =>
      Array.from(document.querySelectorAll(selector))
        .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
        .filter(Boolean);

    return {
      headings: byText('h1, h2, h3, h4'),
      buttons: byText('button'),
      labels: byText('label'),
      sectionTitles: byText('.dm-panel__section-title'),
      nav: byText('.dm-panel__nav button'),
    };
  });
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="password"]', PASSWORD);
  await page.getByRole('button', { name: /desbloquear panel/i }).click();
  await waitForStableView(page);

  const inventory = {
    capturedAt: new Date().toISOString(),
    appUrl: APP_URL,
    views: {},
  };

  for (const view of views) {
    await page.getByRole('button', { name: view.label, exact: true }).click();
    await waitForStableView(page);

    const screenshotPath = path.join(OUTPUT_DIR, view.file);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    inventory.views[view.id] = {
      label: view.label,
      file: `screenshots/dm/${view.file}`,
      meta: await collectVisibleMeta(page),
    };
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'inventory.json'),
    JSON.stringify(inventory, null, 2),
    'utf8'
  );

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
