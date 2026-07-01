import { test, expect } from '../../fixtures/base';
import { SettingsPage } from '../../pages/provider/SettingsPage';

test.describe('A17 Settings', () => {
  test('A17-01 @P0 - All tabs load without error', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();
    for (const tab of ['Profile', 'Practice', 'Referral Prefs', 'Notifications', 'AI & Tools', 'Security'] as const) {
      await settings.tab(tab).click();
      await expect(settings.tab(tab)).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('A17-02 @P0 - Save Profile persists after reload @regression', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();
    await settings.tab('Profile').click();
    const newBio = `E2E_ settings bio ${Date.now()}`;
    await settings.bioInput().fill(newBio);
    await settings.saveProfileButton().click();
    await expect(page.getByText(/profile (saved|updated)/i)).toBeVisible();

    await page.reload();
    await settings.tab('Profile').click();
    await expect(settings.bioInput()).toHaveValue(newBio);
  });

  test('A17-03 @P1 - Save Practice settings persists after reload', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();
    await settings.tab('Practice').click();
    await settings.acceptingNewPatientsSwitch().click();
    const isChecked = await settings.acceptingNewPatientsSwitch().isChecked();
    await settings.savePracticeButton().click();
    await expect(page.getByText(/practice settings saved/i)).toBeVisible();

    await page.reload();
    await settings.tab('Practice').click();
    expect(await settings.acceptingNewPatientsSwitch().isChecked()).toBe(isChecked);
  });

  test('A17-04 @P1 - Save Referral Preferences persists after reload', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();
    await settings.tab('Referral Prefs').click();
    await settings.autoAcceptFromVerifiedSwitch().click();
    const isChecked = await settings.autoAcceptFromVerifiedSwitch().isChecked();
    await settings.saveReferralPrefsButton().click();
    await expect(page.getByText(/referral preferences saved/i)).toBeVisible();

    await page.reload();
    await settings.tab('Referral Prefs').click();
    expect(await settings.autoAcceptFromVerifiedSwitch().isChecked()).toBe(isChecked);
  });

  test('A17-05 @P1 - Save Notification Preferences persists after reload', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();
    await settings.tab('Notifications').click();
    await settings.newReferralSwitch().click();
    const isChecked = await settings.newReferralSwitch().isChecked();
    await settings.saveNotificationsButton().click();
    await expect(page.getByText(/notification settings saved/i)).toBeVisible();

    await page.reload();
    await settings.tab('Notifications').click();
    expect(await settings.newReferralSwitch().isChecked()).toBe(isChecked);
  });

  test('A17-06 @P1 - Save AI & Tools preferences persists after reload', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();
    await settings.tab('AI & Tools').click();
    await settings.enableAiMatchingSwitch().click();
    const isChecked = await settings.enableAiMatchingSwitch().isChecked();
    await settings.saveAiSettingsButton().click();
    await expect(page.getByText(/ai & tools settings saved/i)).toBeVisible();

    await page.reload();
    await settings.tab('AI & Tools').click();
    expect(await settings.enableAiMatchingSwitch().isChecked()).toBe(isChecked);
  });
});
