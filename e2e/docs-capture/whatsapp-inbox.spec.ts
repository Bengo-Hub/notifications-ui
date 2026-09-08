import { test, expect } from '@playwright/test';
import { screenshotWithCallouts } from './lib/annotate';
import { assetPath } from './lib/paths';

// Screenshots for docs/user-guide/notifications/whatsapp-inbox.md. Not a regression suite — reads
// the real conversations list/thread for whichever tenant the demo account belongs to and
// screenshots them as-is, sends nothing. Auth comes from the shared SSO session saved by
// auth.setup.ts (see playwright.config.ts's "docs-capture" project), not a per-test login. Run
// the whole project so that setup runs first:
//   npx playwright test --project=docs-capture e2e/docs-capture/whatsapp-inbox.spec.ts --reporter=list

const OUT = (name: string) => assetPath('whatsapp-inbox', name);

test('conversations list', async ({ page }) => {
  await page.goto('/whatsapp/inbox');
  const heading = page.getByRole('heading', { name: 'WhatsApp Inbox' });
  await expect(heading).toBeVisible({ timeout: 15_000 });

  // The heading renders immediately; conversation rows arrive from a separate, slower fetch.
  // Waiting only for the <table> element (rather than an actual row inside it) shoots the
  // loading/empty state instead of the populated table — wait for a real row, or network idle
  // as a fallback for a genuinely empty inbox.
  const table = page.getByRole('table').or(page.locator('table')).first();
  await table.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  await page
    .locator('table tbody tr td')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

  await screenshotWithCallouts(page, OUT('01-conversations-list.png'), [
    { locator: heading, number: 1 },
    { locator: table, number: 2 },
  ]);
});

test('thread view', async ({ page }) => {
  await page.goto('/whatsapp/inbox');
  const heading = page.getByRole('heading', { name: 'WhatsApp Inbox' });
  await expect(heading).toBeVisible({ timeout: 15_000 });
  // The heading renders immediately; the conversation rows arrive from a separate, slower fetch —
  // confirmed live, checking for row text right after the heading raced ahead of that fetch and
  // intermittently found nothing, which read as "no conversations" rather than "not loaded yet".
  const table = page.locator('table').first();
  await table.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

  // Open the first real conversation, whichever contact it is. Confirmed live: clicking the raw
  // <tr> itself is a no-op even when isVisible() succeeds — DataTable's row-click handler doesn't
  // register there (reads as "click failed" when it's really "nothing was clicked"); clicking the
  // first cell's own content, inside the row, does work.
  const firstCell = page.locator('table tbody tr td').first();
  const hasConversation = await firstCell.isVisible({ timeout: 10_000 }).catch(() => false);
  test.skip(!hasConversation, 'No WhatsApp conversations exist for this tenant to screenshot a thread from.');

  await firstCell.click();
  await page.waitForURL(/\/whatsapp\/inbox\/.+/, { timeout: 8_000 });
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(1000);

  const composer = page.getByPlaceholder('Type a reply...');
  await expect(composer).toBeVisible({ timeout: 10_000 });
  const sendButton = composer.locator('xpath=following-sibling::button[1]');

  // Confirmed live: an unscoped page.locator('button').first() grabbed the sidebar's logout
  // icon (first button in DOM order), not the thread header's back arrow — that icon has no
  // accessible name to target it by role, so just skip annotating it rather than mislabel.
  await screenshotWithCallouts(page, OUT('02-thread.png'), [
    { locator: composer, number: 1, color: '#16a34a' },
    { locator: sendButton, number: 2, color: '#16a34a' },
  ]);
});
