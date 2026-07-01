import { Locator } from '@playwright/test';
import { BasePage } from '../BasePage';

/** client/src/pages/patients/Patients.js */
export class PatientsPage extends BasePage {
  readonly path = '/app/patients';

  searchInput = () => this.page.getByPlaceholder(/search patients/i);
  addPatientButton = () => this.page.getByRole('button', { name: 'Add Patient' });
  filterButton = () => this.page.getByRole('button', { name: /filter/i });
  clearFiltersMenuItem = () => this.page.getByRole('menuitem', { name: /clear filters/i });

  row = (patientName: string): Locator => this.page.getByRole('row', { name: new RegExp(patientName) });

  columnHeader = (name: 'Patient ID' | 'Name' | 'Age / Gender' | 'Contact' | 'Conditions' | 'Risk Level' | 'Last Updated') =>
    this.page.getByRole('columnheader', { name });

  rowActionMenuButton = (patientName: string) => this.row(patientName).getByRole('button', { name: /more|⋮/i });
  createReferralMenuItem = () => this.page.getByRole('menuitem', { name: 'Create Referral' });
  scheduleAppointmentMenuItem = () => this.page.getByRole('menuitem', { name: 'Schedule Appointment' });
  viewPatientDetailsMenuItem = () => this.page.getByRole('menuitem', { name: /view patient details/i });

  async search(term: string): Promise<void> {
    await this.searchInput().fill(term);
  }

  async openRowActions(patientName: string): Promise<void> {
    await this.rowActionMenuButton(patientName).click();
  }

  async openPatient(patientName: string): Promise<void> {
    await this.row(patientName).click();
  }

  // The filter menu has two groups (Risk Level, Gender) both offering an
  // "All" item in the same open menu — {exact: true} disambiguates every
  // other label, but "All" itself needs positional disambiguation: Risk
  // Level's group renders first in the DOM, Gender's second.
  async filterByRiskLevel(level: 'All' | 'High Risk' | 'Medium Risk' | 'Low Risk'): Promise<void> {
    await this.filterButton().click();
    const item = this.page.getByRole('menuitem', { name: level, exact: true });
    await (level === 'All' ? item.first() : item).click();
    await this.page.getByRole('menu').waitFor({ state: 'hidden' });
  }

  async filterByGender(gender: 'All' | 'Male' | 'Female' | 'Other'): Promise<void> {
    await this.filterButton().click();
    const item = this.page.getByRole('menuitem', { name: gender, exact: true });
    await (gender === 'All' ? item.last() : item).click();
    await this.page.getByRole('menu').waitFor({ state: 'hidden' });
  }

  async sortBy(column: 'Name' | 'Age / Gender' | 'Risk Level' | 'Last Updated'): Promise<void> {
    await this.columnHeader(column).click();
  }
}

/** client/src/pages/patients/AddPatient.js — multi-step wizard */
export class AddPatientPage extends BasePage {
  readonly path = '/app/patients/add';

  nameInput = () => this.page.getByLabel(/^(full )?name/i);
  dobInput = () => this.page.getByLabel(/date of birth/i);
  genderSelect = () => this.page.getByLabel(/^gender/i);
  nextButton = () => this.page.getByRole('button', { name: /next/i });
  backButton = () => this.page.getByRole('button', { name: /back/i });
  savePatientButton = () => this.page.getByRole('button', { name: /save patient/i });
  addConditionButton = () => this.page.getByRole('button', { name: /add condition/i });
}

/** client/src/pages/patients/PatientDetail.js */
export class PatientDetailPage extends BasePage {
  readonly path = ''; // dynamic — navigate via patients list or construct with an id

  gotoPatient(patientId: string) {
    return this.page.goto(`/app/patients/${patientId}`);
  }

  primaryProviderLabel = () => this.page.getByText('Primary Provider');
  primaryProviderValue = () => this.primaryProviderLabel().locator('xpath=following-sibling::*[1]');

  editButton = () => this.page.getByRole('button', { name: /^edit$/i });
  grantAccessButton = () => this.page.getByRole('button', { name: /grant access/i });
  exportEhiButton = () => this.page.getByRole('button', { name: /export ehi/i });
}
