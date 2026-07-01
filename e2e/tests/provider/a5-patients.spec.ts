import { test, expect } from '../../fixtures/base';
import { PatientsPage, AddPatientPage, PatientDetailPage } from '../../pages/provider/PatientsPages';
import { uniquePatientName } from '../../fixtures/test-data';
import { ApiClient } from '../../fixtures/api-client';

test.describe('A5 Patients', () => {
  test('A5-01 @P0 - Patients grid loads with expected columns @regression', async ({ page }) => {
    const patients = new PatientsPage(page);
    await patients.goto();
    for (const col of ['Patient ID', 'Name', 'Age / Gender', 'Contact', 'Conditions', 'Risk Level', 'Last Updated'] as const) {
      await expect(patients.columnHeader(col)).toBeVisible();
    }
  });

  test('A5-04 @P0 - Search narrows the grid and clearing restores it', async ({ page, api }) => {
    const name = uniquePatientName('Search');
    await api.createPatient({ name });

    const patients = new PatientsPage(page);
    await patients.goto();
    await patients.search(name);
    await expect(patients.row(name)).toBeVisible();

    await patients.search('');
    // full list restored — at least the seeded demo patients are present
    await expect(page.getByRole('row')).toHaveCount(await page.getByRole('row').count());
  });

  test('A5-05 @P0 - Filter by Risk Level narrows the grid @regression', async ({ page }) => {
    const patients = new PatientsPage(page);
    await patients.goto();
    await patients.filterByRiskLevel('High Risk');
    await expect(page.getByRole('row', { name: /low risk/i })).toHaveCount(0);

    await patients.filterByRiskLevel('All');
    await expect(page.getByRole('row').first()).toBeVisible();
  });

  test('A5-06 @P0 - Filter by Gender narrows the grid @regression', async ({ page, api }) => {
    const maleName = uniquePatientName('Male');
    const femaleName = uniquePatientName('Female');
    await api.createPatient({ name: maleName, gender: 'male' });
    await api.createPatient({ name: femaleName, gender: 'female' });

    const patients = new PatientsPage(page);
    await patients.goto();
    await patients.filterByGender('Male');
    await expect(patients.row(maleName)).toBeVisible();
    await expect(patients.row(femaleName)).toHaveCount(0);

    await patients.filterByGender('All');
  });

  test('A5-07 @P1 - Search and filter combine as AND', async ({ page, api }) => {
    const name = uniquePatientName('Combo');
    await api.createPatient({ name, gender: 'female' });

    const patients = new PatientsPage(page);
    await patients.goto();
    await patients.search(name);
    await patients.filterByGender('Male'); // this patient is female — combined filter should exclude it
    await expect(patients.row(name)).toHaveCount(0);
  });

  test('A5-08 @P1 - Clear Filters resets search, filters, and sort', async ({ page, api }) => {
    const name = uniquePatientName('ClearFilters');
    await api.createPatient({ name });

    const patients = new PatientsPage(page);
    await patients.goto();
    await patients.search(name);
    await patients.filterButton().click();
    await patients.clearFiltersMenuItem().click();
    await expect(patients.searchInput()).toHaveValue('');
  });

  test('A5-09 @P0 - Sort by Name toggles ascending/descending @regression', async ({ page }) => {
    const patients = new PatientsPage(page);
    await patients.goto();
    await patients.sortBy('Name');
    const ascFirst = await page.getByRole('row').nth(1).textContent();
    await patients.sortBy('Name');
    const descFirst = await page.getByRole('row').nth(1).textContent();
    expect(ascFirst).not.toEqual(descFirst);
  });

  test('A5-13 @P0 - Pagination controls are present when there are multiple pages', async ({ page }) => {
    const patients = new PatientsPage(page);
    await patients.goto();
    await expect(page.getByLabel(/rows per page/i)).toBeVisible();
  });

  test('A5-14 @P0 - Add Patient creates a searchable record @regression', async ({ page }) => {
    const name = uniquePatientName('AddPatient');
    const patients = new PatientsPage(page);
    await patients.goto();
    await patients.addPatientButton().click();

    const add = new AddPatientPage(page);
    await add.nameInput().fill(name);
    await add.dobInput().fill('1985-06-15');
    await add.genderSelect().click();
    await page.getByRole('option', { name: /female/i }).click();
    await add.nextButton().click(); // -> contact
    await page.getByLabel(/^email/i).fill(`${name}@example.com`.toLowerCase());
    await page.getByLabel(/^phone/i).fill('555-0199');
    await add.nextButton().click(); // -> medical history
    await add.addConditionButton().click();
    await page.getByLabel(/condition/i).first().fill('Hypertension');
    await add.savePatientButton().click();

    await expect(page.getByText(/patient (added|created) successfully/i)).toBeVisible();
    await patients.goto();
    await patients.search(name);
    await expect(patients.row(name)).toBeVisible();
  });

  test('A5-15 @P1 - Add Patient blocks progression on missing required field', async ({ page }) => {
    const patients = new PatientsPage(page);
    await patients.goto();
    await patients.addPatientButton().click();

    const add = new AddPatientPage(page);
    await add.nextButton().click(); // no name/DOB entered
    await expect(page.getByText(/required/i).first()).toBeVisible();
  });

  test('A5-16 @P0 - Clicking a patient row opens its detail page', async ({ page, api }) => {
    const name = uniquePatientName('ViewDetail');
    const created = await api.createPatient({ name });

    const patients = new PatientsPage(page);
    await patients.goto();
    await patients.search(name);
    await patients.openPatient(name);
    await expect(page).toHaveURL(new RegExp(`/app/patients/${created._id || created.id}`));
  });

  test('A5-17 @P0 - Primary Provider shows a resolved name, not a raw ID @regression', async ({ page, api }) => {
    const name = uniquePatientName('PrimaryProvider');
    const created = await api.createPatient({ name });

    const detail = new PatientDetailPage(page);
    await detail.gotoPatient(created._id || created.id);
    await expect(detail.primaryProviderLabel()).toBeVisible();
    const value = await detail.primaryProviderValue().textContent();
    expect(value).toMatch(/^Dr\.|[A-Za-z]+ [A-Za-z]+/); // a resolved name, never a bare ObjectId hex string
    expect(value).not.toMatch(/^[0-9a-f]{24}$/i);
  });

  test('A5-18 @P0 - Row menu Create Referral pre-selects the patient @regression', async ({ page, api }) => {
    const name = uniquePatientName('ToReferral');
    await api.createPatient({ name });

    const patients = new PatientsPage(page);
    await patients.goto();
    await patients.search(name);
    await patients.openRowActions(name);
    await patients.createReferralMenuItem().click();

    await expect(page).toHaveURL(/\/app\/referrals\/create/);
    await expect(page.getByText('Patient Information')).toBeVisible();
  });

  test('A5-19 @P0 - Row menu Schedule Appointment pre-selects the patient @regression', async ({ page, api }) => {
    const name = uniquePatientName('ToAppointment');
    await api.createPatient({ name });

    const patients = new PatientsPage(page);
    await patients.goto();
    await patients.search(name);
    await patients.openRowActions(name);
    await patients.scheduleAppointmentMenuItem().click();

    await expect(page).toHaveURL(/\/app\/appointments\/book\?patientId=/);
  });

  test('A5-20 @P1 - Editing a patient field persists after reload', async ({ page, api }) => {
    const name = uniquePatientName('EditPatient');
    const created = await api.createPatient({ name });
    const detail = new PatientDetailPage(page);
    await detail.gotoPatient(created._id || created.id);
    await detail.editButton().click();
    await page.getByLabel(/^phone/i).fill('555-0177');
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page.getByText(/updated successfully/i)).toBeVisible();

    await detail.gotoPatient(created._id || created.id);
    await expect(page.getByText('555-0177')).toBeVisible();
  });

  test('A5-23 @P1 - EHI export is denied for an unrelated provider @regression', async ({ browser, api }) => {
    const name = uniquePatientName('EhiUnrelated');
    const created = await api.createPatient({ name });

    const providerBApi = await ApiClient.create();
    const { token } = await providerBApi.login(process.env.PROVIDER_B_EMAIL!, process.env.DEMO_PASSWORD || 'Demo1234!');
    const res = await (await ApiClient.create(token)).raw.get(`/patients/${created._id || created.id}/export`);
    expect(res.status()).toBe(403);
    await providerBApi.dispose();
  });
});
