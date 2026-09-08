import { test, expect } from '@playwright/test';
import { screenshotWithCallouts } from './lib/annotate';
import { assetPath } from './lib/paths';

// Screenshots for docs/user-guide/notifications/monitoring.md. Not a regression suite. Tenant
// scope only — this reads whatever tenant the demo account belongs to, never another tenant's
// data (see the resolveActingTenantID fix in notifications-api's tenant_resolve.go). Auth comes
// from the shared SSO session saved by auth.setup.ts. Run the whole project so setup runs first:
//   npx playwright test --project=docs-capture-setup --project=docs-capture e2e/docs-capture/monitoring.spec.ts --reporter=list

const OUT = (name: string) => assetPath('monitoring', name);

test('overview cards and live activity feed', async ({ page }) => {
  await page.goto('/monitoring');
  const heading = page.getByRole('heading', { name: 'System Monitoring' });
  await expect(heading).toBeVisible({ timeout: 15_000 });
  // The KPI cards and feed both fetch independently — give the slower of the two (the feed's
  // table) a real chance to settle before shooting, rather than trusting networkidle alone.
  await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => {});
  await page.waitForTimeout(1000);

  // Confirmed live: "Live Activity Feed" sits below the fold on a 900px viewport, so a callout
  // targeting it gets clamped to the bottom edge with its arrow pointing at nothing visible —
  // only annotate what the viewport shot actually shows.
  const rangeToggle = page.getByRole('button', { name: /24H|7D/ }).first();
  const channelDistribution = page.getByText('Channel Distribution');

  await screenshotWithCallouts(page, OUT('01-overview.png'), [
    { locator: rangeToggle, number: 1 },
    { locator: channelDistribution, number: 2 },
  ]);

  const feedHeading = page.getByText('Live Activity Feed');
  await feedHeading.scrollIntoViewIfNeeded();
  // The feed's own table fetches independently of the heading above it — wait for a real row (or
  // an explicit empty-state message) rather than a fixed delay, so a slow fetch doesn't get
  // shot mid-loading.
  await page
    .locator('table tbody tr td')
    .first()
    .waitFor({ state: 'visible', timeout: 8_000 })
    .catch(() => {});
  await page.waitForTimeout(400);
  const channelFilter = page.locator('select').first();

  await screenshotWithCallouts(page, OUT('02-activity-feed.png'), [
    { locator: feedHeading, number: 1 },
    { locator: channelFilter, number: 2 },
  ]);
});
