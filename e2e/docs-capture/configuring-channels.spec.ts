import { test, expect } from '@playwright/test';
import { screenshotWithCallouts } from './lib/annotate';
import { assetPath } from './lib/paths';

// Screenshots for docs/user-guide/notifications/configuring-channels.md's channel-picker section.
// Not a regression suite — opens the modal and closes it without saving. Auth comes from the
// shared SSO session saved by auth.setup.ts. Run the whole project so setup runs first:
//   npx playwright test --project=docs-capture e2e/docs-capture/configuring-channels.spec.ts --reporter=list

const OUT = (name: string) => assetPath('configuring-channels', name);

test('notification preferences list and channel picker', async ({ page }) => {
  await page.goto('/settings/notifications');
  const heading = page.getByRole('heading', { name: 'Notification Preferences' });
  await expect(heading).toBeVisible({ timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

  // Wait for an actual row, not just the <table> element — the table itself renders before its
  // rows arrive from a separate fetch, and shooting too early captures the loading/empty state.
  const table = page.locator('table').first();
  await table.waitFor({ state: 'visible', timeout: 8_000 });
  await page
    .locator('table tbody tr td')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
  await screenshotWithCallouts(page, OUT('01-preferences-list.png'), [{ locator: heading, number: 1 }]);

  const channelPickerButton = page.locator('button[title="Choose which channels to use"]').first();
  await expect(channelPickerButton).toBeVisible({ timeout: 8_000 });
  await channelPickerButton.click();

  const modalDescription = page.getByText('Choose which channels this notification actually goes out on.');
  await expect(modalDescription).toBeVisible({ timeout: 8_000 });
  const saveButton = page.getByRole('button', { name: 'Save' });

  await screenshotWithCallouts(page, OUT('02-channel-picker-modal.png'), [
    { locator: modalDescription, number: 1 },
    { locator: saveButton, number: 2, color: '#16a34a' },
  ]);

  await page.getByRole('button', { name: 'Cancel' }).click().catch(() => {});
});
