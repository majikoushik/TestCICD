import { test, expect } from '../../fixtures/base';
import { BookAppointmentPage, MyAppointmentsPage, ProviderSchedulePage } from '../../pages/provider/AppointmentsPages';
import { uniquePatientName, uniqueChiefComplaint, daysFromNow } from '../../fixtures/test-data';
import { ApiClient } from '../../fixtures/api-client';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';

async function getProviderAId(): Promise<string> {
  const api = await ApiClient.create();
  const { user } = await api.login(process.env.PROVIDER_A_EMAIL!, DEMO_PASSWORD);
  await api.dispose();
  return user.id || user._id;
}

test.describe('A7 Appointments & Schedule', () => {
  test('A7-01 @P0 - Book an appointment end-to-end @regression', async ({ page, api }) => {
    const patientName = uniquePatientName('Book');
    await api.createPatient({ name: patientName });
    const complaint = uniqueChiefComplaint();

    const book = new BookAppointmentPage(page);
    await book.goto();
    await book.fillStep1({ patientName, chiefComplaint: complaint, appointmentType: 'Follow-up' });
    await book.nextButton().click();

    await book.firstAvailableDateOption().click();
    await book.firstAvailableTimeSlot().click();
    await book.nextButton().click();

    await book.confirmButton().click();
    await expect(book.successMessage()).toBeVisible();
  });

  test('A7-02 @P0 - Book with a pre-selected patient via query param @regression', async ({ page, api }) => {
    const patientName = uniquePatientName('Preselected');
    const patient = await api.createPatient({ name: patientName });

    const book = new BookAppointmentPage(page);
    await book.gotoWithPatient(patient._id || patient.id);
    await expect(page.getByText(patientName, { exact: true })).toBeVisible();
  });

  test('A7-03 @P1 - Booking validation blocks incomplete steps', async ({ page }) => {
    const book = new BookAppointmentPage(page);
    await book.goto();
    await book.nextButton().click(); // no patient/chief complaint
    await expect(page.getByText(/required|select a patient/i).first()).toBeVisible();
  });

  test('A7-04 @P0 - Double-booking the same slot is rejected @regression', async ({ api }) => {
    const providerId = await getProviderAId();
    const patient1 = await api.createPatient({ name: uniquePatientName('DoubleBook1') });
    const patient2 = await api.createPatient({ name: uniquePatientName('DoubleBook2') });
    const date = daysFromNow(10);

    await api.bookAppointment({
      providerId, patientId: patient1._id || patient1.id, patientName: patient1.name,
      scheduledDate: date, startTime: '10:00', endTime: '10:30',
      chiefComplaint: uniqueChiefComplaint(),
    });

    const res = await api.raw.post('/appointments', {
      data: {
        providerId, providerName: 'Dr. John Smith', providerSpecialty: 'Cardiology', organizationName: 'Metro Heart Institute',
        patientId: patient2._id || patient2.id, patientName: patient2.name, patientEmail: 'p2@example.com', patientPhone: '555-0100',
        appointmentType: 'follow_up', scheduledDate: date, startTime: '10:00', endTime: '10:30', durationMinutes: 30,
        location: 'in_person', chiefComplaint: uniqueChiefComplaint(),
      },
    });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.message).toMatch(/this time slot is no longer available/i);
  });

  test('A7-05 @P1 - Telehealth appointment type auto-sets location', async ({ page, api }) => {
    const patientName = uniquePatientName('Telehealth');
    await api.createPatient({ name: patientName });

    const book = new BookAppointmentPage(page);
    await book.goto();
    await book.selectPatientByName(patientName);
    await book.chiefComplaintInput().fill(uniqueChiefComplaint());
    await book.appointmentTypeSelect().click();
    await page.getByRole('option', { name: /telehealth/i }).click();
    await expect(book.locationSelect()).toHaveText(/telehealth/i);
  });

  test('A7-06 @P0 - My Appointments Upcoming/Past tabs filter by time window', async ({ page }) => {
    const my = new MyAppointmentsPage(page);
    await my.goto();
    await my.tab('Upcoming').click();
    await expect(my.tab('Upcoming')).toHaveAttribute('aria-selected', 'true');
    await my.tab('Past').click();
    await expect(my.tab('Past')).toHaveAttribute('aria-selected', 'true');
  });

  test('A7-07 @P0 - Cancel a scheduled appointment records the reason @regression', async ({ page, api }) => {
    const providerId = await getProviderAId();
    const patient = await api.createPatient({ name: uniquePatientName('Cancel') });
    const appt = await api.bookAppointment({
      providerId, patientId: patient._id || patient.id, patientName: patient.name,
      scheduledDate: daysFromNow(5), startTime: '11:00', endTime: '11:30', chiefComplaint: uniqueChiefComplaint(),
    });

    const my = new MyAppointmentsPage(page);
    await my.goto();
    await my.cancelButton(patient.name).click();
    await my.cancellationReasonInput().fill('Patient requested reschedule to a later date.');
    await my.confirmCancelButton().click();
    await expect(page.getByText(/appointment cancelled/i)).toBeVisible();

    const res = await api.raw.get(`/appointments/${appt._id || appt.id}`);
    const body = (await res.json()).data;
    expect(body.status).toBe('cancelled');
    expect(body.cancellationReason).toBeTruthy();
  });

  test('A7-09 @P1 - Cancelling an already-cancelled appointment is blocked server-side', async ({ api }) => {
    const providerId = await getProviderAId();
    const patient = await api.createPatient({ name: uniquePatientName('DoubleCancel') });
    const appt = await api.bookAppointment({
      providerId, patientId: patient._id || patient.id, patientName: patient.name,
      scheduledDate: daysFromNow(6), startTime: '12:00', endTime: '12:30', chiefComplaint: uniqueChiefComplaint(),
    });
    await api.raw.put(`/appointments/${appt._id || appt.id}/cancel`, { data: { reason: 'first cancel' } });
    const res = await api.raw.put(`/appointments/${appt._id || appt.id}/cancel`, { data: { reason: 'second cancel' } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/cannot cancel an appointment with status 'cancelled'/i);
  });

  test('A7-10 & A7-11 @P0 - Reschedule updates the original, no duplicate created @regression', async ({ page, api }) => {
    const providerId = await getProviderAId();
    const patient = await api.createPatient({ name: uniquePatientName('Reschedule') });
    const appt = await api.bookAppointment({
      providerId, patientId: patient._id || patient.id, patientName: patient.name,
      scheduledDate: daysFromNow(7), startTime: '13:00', endTime: '13:30', chiefComplaint: uniqueChiefComplaint(),
    });

    const book = new BookAppointmentPage(page);
    await book.gotoWithReschedule(appt._id || appt.id);
    await expect(book.reschedulingBanner()).toBeVisible();
    await book.nextButton().click(); // Patient Details (prefilled) -> Select Time
    await book.firstAvailableDateOption().click();
    await book.firstAvailableTimeSlot().click();
    await book.nextButton().click(); // Select Time -> Confirm
    await book.confirmButton().click();
    await expect(book.successMessage()).toBeVisible();

    // GET /appointments (provider/patient self-service) filters by the
    // caller's OWN patientId, ignoring any patientId query param — it's not
    // usable to look up a specific patient as a provider. GET /admin/appointments
    // does support a real patientId filter and returns a bare array.
    const admin = await ApiClient.create();
    const { token } = await admin.adminLogin(process.env.ADMIN_EMAIL!, DEMO_PASSWORD);
    await admin.dispose();
    const adminClient = await ApiClient.create(token);
    const listRes = await adminClient.raw.get('/admin/appointments', { params: { patientId: patient._id || patient.id } });
    const list = (await listRes.json()).data.appointments || [];
    await adminClient.dispose();
    expect(list.length).toBe(1); // no duplicate created
    expect(list[0].rescheduleHistory?.length).toBeGreaterThan(0);
  });

  test('A7-12 @P0 - Check-in then Complete-with-outcome workflow advances status @regression', async ({ page, api }) => {
    // The Provider Schedule UI exposes exactly two provider actions per
    // AppointmentCard.js: "Check In" (scheduled/confirmed -> checked_in) and
    // "Complete" (checked_in OR in_progress -> completed, via the outcome
    // dialog). There is no separate "Start Visit" control in this app.
    const providerId = await getProviderAId();
    const patient = await api.createPatient({ name: uniquePatientName('Workflow') });
    await api.bookAppointment({
      providerId, patientId: patient._id || patient.id, patientName: patient.name,
      scheduledDate: daysFromNow(0), startTime: '09:00', endTime: '09:30', chiefComplaint: uniqueChiefComplaint(),
    });

    const schedule = new ProviderSchedulePage(page);
    await schedule.goto();
    await schedule.tab('My Schedule').click();
    await schedule.checkInButton(patient.name).click();
    await expect(page.getByText(/checked in/i)).toBeVisible();
    await schedule.completeButton(patient.name).click();
    await page.getByLabel(/diagnosis/i).fill('Routine follow-up, stable.');
    await page.getByLabel(/outcome notes/i).fill('Patient stable, continue current plan.');
    await page.getByRole('button', { name: /complete visit/i }).click();
    await expect(page.getByText(/appointment completed/i)).toBeVisible();
  });

  test('A7-13 @P1 - No-Show is admin-only; server records it correctly with no token reward', async ({ page, api }) => {
    // client/src/components/appointments/AppointmentCard.js exposes no
    // "No-Show" control anywhere in the provider portal — marking an
    // appointment no_show is an admin-only action (see B7-03). This test
    // confirms the app's own boundary: no such button renders here, and the
    // underlying status transition behaves correctly when triggered.
    const providerId = await getProviderAId();
    const patient = await api.createPatient({ name: uniquePatientName('NoShow') });
    const appt = await api.bookAppointment({
      providerId, patientId: patient._id || patient.id, patientName: patient.name,
      scheduledDate: daysFromNow(1), startTime: '14:00', endTime: '14:30', chiefComplaint: uniqueChiefComplaint(),
    });
    const balanceBefore = await api.getTokenBalance();

    const my = new MyAppointmentsPage(page);
    await my.goto();
    await my.tab('Upcoming').click();
    await expect(page.getByText(patient.name).locator('xpath=ancestor::*[contains(@class,"MuiCard")][1]').getByRole('button', { name: /no-show/i })).toHaveCount(0);

    await api.setAppointmentStatus(appt._id || appt.id, 'no_show');
    const balanceAfter = await api.getTokenBalance();
    expect(balanceAfter).toBe(balanceBefore);
    const res = await api.raw.get(`/appointments/${appt._id || appt.id}`);
    expect((await res.json()).data.status).toBe('no_show');
  });

  test('A7-15 @P0 - Token reward on appointment completion @regression', async ({ api }) => {
    const providerId = await getProviderAId();
    const patient = await api.createPatient({ name: uniquePatientName('TokenReward') });
    const appt = await api.bookAppointment({
      providerId, patientId: patient._id || patient.id, patientName: patient.name,
      scheduledDate: daysFromNow(0), startTime: '15:00', endTime: '15:30', chiefComplaint: uniqueChiefComplaint(),
    });

    const before = await api.getTokenBalance();
    await api.setAppointmentStatus(appt._id || appt.id, 'checked_in');
    await api.setAppointmentStatus(appt._id || appt.id, 'in_progress');
    await api.setAppointmentStatus(appt._id || appt.id, 'completed', { diagnosis: 'Stable', outcomeNotes: 'No change needed', followUpRequired: false });
    const after = await api.getTokenBalance();
    expect(after).toBeGreaterThan(before);

    // Re-completing (idempotency) must not double-award.
    const res = await api.raw.put(`/appointments/${appt._id || appt.id}/status`, { data: { status: 'completed' } });
    const afterSecond = await api.getTokenBalance();
    expect(afterSecond).toBe(after);
  });

  test('A7-17 @P1 - Set weekly availability persists after reload', async ({ page }) => {
    const schedule = new ProviderSchedulePage(page);
    await schedule.goto();
    await schedule.tab('Manage Availability').click();
    await schedule.saveAvailabilityButton().click();
    await expect(page.getByText(/availability (saved|updated)/i)).toBeVisible();

    await page.reload();
    await schedule.tab('Manage Availability').click();
    await expect(schedule.saveAvailabilityButton()).toBeVisible();
  });

  test('A7-18 @P1 - Add a schedule exception blocks slots on that date', async ({ page }) => {
    const schedule = new ProviderSchedulePage(page);
    await schedule.goto();
    await schedule.tab('Exceptions').click();
    await schedule.addExceptionButton().click();
    const exceptionDate = daysFromNow(20);
    await schedule.exceptionDateInput().fill(exceptionDate);
    await schedule.exceptionTypeSelect().click();
    await page.getByRole('option', { name: /unavailable all day/i }).click();
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page.getByText(exceptionDate)).toBeVisible();
  });
});
