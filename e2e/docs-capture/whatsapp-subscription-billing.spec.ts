import { test, expect } from '@playwright/test';
import { screenshotWithCallouts } from './lib/annotate';
import { assetPath } from './lib/paths';

// Screenshots for docs/user-guide/notifications/whatsapp-subscription-billing.md.
// Tenant-facing view only — the platform-admin "Platform > Subscriptions" screen is a
// separate, internal-only workflow and is intentionally not captured or documented here.
// Auth comes from the shared SSO session saved by auth.setup.ts. Run the whole project so setup
// runs first:
//   npx playwright test --project=docs-capture e2e/docs-capture/whatsapp-subscription-billing.spec.ts --reporter=list

const OUT = (name: string) => assetPath('whatsapp-subscription-billing', name);

test('tenant subscription and plans', async ({ page }) => {
  await page.goto('/billing/whatsapp');
  const heading = page.getByRole('heading', { name: 'WhatsApp Subscription' });
  await expect(heading).toBeVisible({ timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

  const currentSub = page.getByText('Current Subscription');
  const plansHeading = page.getByText('Available Plans');

  await screenshotWithCallouts(page, OUT('01-plans.png'), [
    { locator: currentSub, number: 1 },
    { locator: plansHeading, number: 2 },
  ]);
});
