import { Page, Locator, expect } from '@playwright/test';

/**
 * Shared behavior for every page object in this suite. Concrete pages
 * extend this rather than duplicating the same wait/snackbar/error helpers
 * — MUI's Snackbar and Alert components are used identically across the
 * whole app (see e.g. client/src/pages/referrals/Referrals.js, Notifications.js).
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  abstract readonly path: string;

  async goto(): Promise<void> {
    await this.page.goto(this.path);
  }

  /** MUI Snackbar with a plain `message` prop — see Referrals.js actionSuccess pattern. */
  snackbarWithText(text: string | RegExp): Locator {
    return this.page.getByText(text).locator('xpath=ancestor-or-self::*[contains(@class,"MuiSnackbar") or contains(@class,"MuiAlert")]').first();
  }

  /** MUI Alert (severity="error") — used for both form validation and API error surfacing. */
  get errorAlert(): Locator {
    return this.page.locator('.MuiAlert-standardError, .MuiAlert-filledError, .MuiAlert-outlinedError');
  }

  get successAlert(): Locator {
    return this.page.locator('.MuiAlert-standardSuccess, .MuiAlert-filledSuccess, .MuiAlert-outlinedSuccess');
  }

  get infoAlert(): Locator {
    return this.page.locator('.MuiAlert-standardInfo, .MuiAlert-filledInfo, .MuiAlert-outlinedInfo');
  }

  async expectErrorContaining(text: string | RegExp): Promise<void> {
    await expect(this.errorAlert.filter({ hasText: text })).toBeVisible();
  }

  /** Opens a MUI <Select> by its associated label and picks the option by visible text. */
  async selectMuiOption(label: string | RegExp, optionText: string | RegExp): Promise<void> {
    await this.page.getByLabel(label).click();
    await this.page.getByRole('option', { name: optionText }).click();
  }

  async waitForToast(text: string | RegExp): Promise<void> {
    await expect(this.page.getByText(text)).toBeVisible();
  }
}
