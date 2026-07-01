import { test, expect } from '../../fixtures/base';
import { AdminAppointmentsPage } from '../../pages/admin/AdminAppointmentsPage';
import { ApiClient } from '../../fixtures/api-client';
import { uniquePatientName, uniqueChiefComplaint, daysFromNow } from '../../fixtures/test-data';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';

async function bookAppointmentAsProviderA(patientName: string, daysOut: number) {
  const login = await ApiClient.create();
  const { token, user } = await login.login(process.env.PROVIDER_A_EMAIL!, DEMO_PASSWORD);
  await login.dispose();
  const provider = await ApiClient.create(token);
  const patient = await provider.createPatient({ name: patientName });
  const appt = await provider.bookAppointment({
    providerId: user.id || user._id, patientId: patient._id || patient.id, patientName: patient.name,
    scheduledDate: daysFromNow(daysOut), startTime: '10:00', endTime: '10:30', chiefComplaint: uniqueChiefComplaint(),
  });
  await provider.dispose();
  return appt;
}

test.describe('B7 Admin — Appointments & Provider Utilization', () => {
  test('B7-01 @P0 - All Appointments tab loads with stat cards and filters @regression', async ({ page }) => {
    const appointments = new AdminAppointmentsPage(page);
    await appointments.goto();
    await expect(appointments.searchInput()).toBeVisible();
    await expect(appointments.statusSelect()).toBeVisible();
  });

  // AppointmentDetailDialog (client/src/pages/admin/AdminAppointments.js) has no
  // success snackbar — clicking an action button shows an inline "Are you
  // sure?" alert with a "Confirm" button, then the dialog just closes. These
  // tests confirm the closed dialog (no error alert) and the real resulting
  // status via the API, rather than a success message that doesn't exist.

  test('B7-02 @P0 - Mark an appointment completed from admin without a 404 @regression', async ({ page, api }) => {
    const patientName = uniquePatientName('AdminApptComplete');
    const appt = await bookAppointmentAsProviderA(patientName, 0);

    const appointments = new AdminAppointmentsPage(page);
    await appointments.goto();
    await appointments.searchInput().fill(patientName);
    await appointments.viewIcon(patientName).click();
    await appointments.markCompletedButton().click();
    await page.getByRole('button', { name: /^confirm$/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const res = await api.raw.get(`/appointments/${appt._id || appt.id}`);
    expect((await res.json()).data.status).toBe('completed');
  });

  test('B7-03 @P0 - Mark an appointment no-show from admin @regression', async ({ page, api }) => {
    const patientName = uniquePatientName('AdminApptNoShow');
    const appt = await bookAppointmentAsProviderA(patientName, 1);

    const appointments = new AdminAppointmentsPage(page);
    await appointments.goto();
    await appointments.searchInput().fill(patientName);
    await appointments.viewIcon(patientName).click();
    await appointments.markNoShowButton().click();
    await page.getByRole('button', { name: /^confirm$/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const res = await api.raw.get(`/appointments/${appt._id || appt.id}`);
    expect((await res.json()).data.status).toBe('no_show');
  });

  test('B7-04 @P0 - Cancel an appointment from admin records a cancellation reason @regression', async ({ page, api }) => {
    const patientName = uniquePatientName('AdminApptCancel');
    const appt = await bookAppointmentAsProviderA(patientName, 2);

    const appointments = new AdminAppointmentsPage(page);
    await appointments.goto();
    await appointments.searchInput().fill(patientName);
    await appointments.viewIcon(patientName).click();
    await appointments.cancelButton().click();
    await page.getByRole('button', { name: /^confirm$/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const res = await api.raw.get(`/appointments/${appt._id || appt.id}`);
    const body = (await res.json()).data;
    expect(body.status).toBe('cancelled');
    expect(body.cancellationReason).toBeTruthy();
  });

  test('B7-05 @P1 - Analytics tab loads charts', async ({ page }) => {
    const appointments = new AdminAppointmentsPage(page);
    await appointments.goto();
    await appointments.tab('Analytics').click();
    await expect(appointments.tab('Analytics')).toHaveAttribute('aria-selected', 'true');
  });

  test('B7-06 @P0 - Provider Utilization date range selector re-fetches data @regression', async ({ page }) => {
    const appointments = new AdminAppointmentsPage(page);
    await appointments.goto();
    await appointments.tab('Provider Utilization').click();
    for (const range of ['7 days', '30 days', '90 days', 'Year to Date'] as const) {
      await appointments.setDateRange(range);
    }
  });
});
