import { BasePage } from '../BasePage';

/** client/src/pages/appointments/BookAppointment.js — stepper: Patient Details -> Select Time -> Confirm & Schedule */
export class BookAppointmentPage extends BasePage {
  readonly path = '/app/appointments/book';

  gotoWithReschedule(appointmentId: string) {
    return this.page.goto(`/app/appointments/book?reschedule=${appointmentId}`);
  }
  gotoWithPatient(patientId: string) {
    return this.page.goto(`/app/appointments/book?patientId=${patientId}`);
  }

  pageTitle = () => this.page.getByRole('heading', { name: /schedule patient appointment|reschedule appointment/i });
  reschedulingBanner = () => this.page.getByText(/rescheduling appointment for/i);

  selectPatientInput = () => this.page.getByLabel(/select patient/i);
  chiefComplaintInput = () => this.page.getByLabel(/chief complaint/i);
  reasonForVisitInput = () => this.page.getByLabel(/reason for visit/i);
  appointmentTypeSelect = () => this.page.getByLabel(/appointment type/i);
  locationSelect = () => this.page.getByLabel(/^location/i);

  nextButton = () => this.page.getByRole('button', { name: /^next$/i });
  backButton = () => this.page.getByRole('button', { name: /^back$/i });

  // TimeSlotPicker.js renders unlabeled MUI Boxes — selected via the
  // data-testid hooks added to that component specifically for automation.
  dateOptionByValue = (isoDate: string) => this.page.getByTestId(`date-option-${isoDate}`);
  firstAvailableDateOption = () => this.page.locator('[data-testid^="date-option-"]').first();
  timeSlotByValue = (startTime: string) => this.page.getByTestId(`time-slot-${startTime}`);
  firstAvailableTimeSlot = () => this.page.locator('[data-testid^="time-slot-"][data-available="true"]').first();

  confirmButton = () => this.page.getByRole('button', { name: /confirm & schedule appointment|confirm reschedule/i });
  successMessage = () => this.page.getByText(/appointment (scheduled|rescheduled) successfully/i);
  slotUnavailableError = () => this.page.getByText(/this time slot is no longer available/i);

  async selectPatientByName(name: string): Promise<void> {
    await this.selectPatientInput().fill(name);
    await this.page.getByRole('option', { name: new RegExp(name) }).first().click();
  }

  async fillStep1(opts: { patientName?: string; chiefComplaint: string; appointmentType?: string }): Promise<void> {
    if (opts.patientName) await this.selectPatientByName(opts.patientName);
    await this.chiefComplaintInput().fill(opts.chiefComplaint);
    if (opts.appointmentType) await this.selectMuiOption(/appointment type/i, opts.appointmentType);
  }
}

/** client/src/pages/appointments/MyAppointments.js */
export class MyAppointmentsPage extends BasePage {
  readonly path = '/app/appointments';

  scheduleForPatientButton = () => this.page.getByRole('button', { name: /schedule for patient/i });
  tab = (name: 'Upcoming' | 'Past') => this.page.getByRole('tab', { name });

  appointmentCard = (patientName: string) => this.page.getByText(patientName).locator('xpath=ancestor::*[contains(@class,"MuiCard") or contains(@class,"MuiPaper")][1]');

  cancelButton = (patientName: string) => this.appointmentCard(patientName).getByRole('button', { name: /cancel/i });
  rescheduleButton = (patientName: string) => this.appointmentCard(patientName).getByRole('button', { name: /reschedule/i });
  remindButton = (patientName: string) => this.appointmentCard(patientName).getByRole('button', { name: /remind/i });
  viewButton = (patientName: string) => this.appointmentCard(patientName).getByRole('button', { name: /view/i });

  cancellationReasonInput = () => this.page.getByLabel(/cancellation reason|reason/i);
  confirmCancelButton = () => this.page.getByRole('button', { name: /confirm/i });
}

/** client/src/pages/schedule/ProviderSchedule.js — tabs: My Schedule / All Appointments / Manage Availability / Exceptions */
export class ProviderSchedulePage extends BasePage {
  readonly path = '/app/schedule';

  tab = (name: 'My Schedule' | 'All Appointments' | 'Manage Availability' | 'Exceptions') =>
    this.page.getByRole('tab', { name });

  checkInButton = (patientName: string) =>
    this.page.getByText(patientName).locator('xpath=ancestor::*[contains(@class,"MuiCard")][1]').getByRole('button', { name: /check in/i });
  completeButton = (patientName: string) =>
    this.page.getByText(patientName).locator('xpath=ancestor::*[contains(@class,"MuiCard")][1]').getByRole('button', { name: /complete/i });
  noShowButton = (patientName: string) =>
    this.page.getByText(patientName).locator('xpath=ancestor::*[contains(@class,"MuiCard")][1]').getByRole('button', { name: /no-show/i });

  // Manage Availability tab
  dayToggle = (day: string) => this.page.getByRole('row', { name: new RegExp(day) }).getByRole('checkbox');
  saveAvailabilityButton = () => this.page.getByRole('button', { name: /^save$/i });

  // Exceptions tab
  addExceptionButton = () => this.page.getByRole('button', { name: /add exception/i });
  exceptionDateInput = () => this.page.getByLabel(/^date/i);
  exceptionTypeSelect = () => this.page.getByLabel(/^type/i);
  exceptionReasonSelect = () => this.page.getByLabel(/reason/i);
  deleteExceptionButton = (dateText: string) =>
    this.page.getByRole('row', { name: new RegExp(dateText) }).getByRole('button', { name: /delete/i });
}
