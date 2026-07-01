import { APIRequestContext, request } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

export interface LoginResult {
  token: string;
  user: Record<string, any>;
}

/**
 * Wraps an APIRequestContext so relative paths resolve correctly against an
 * API_BASE_URL that itself has a path component (e.g. ".../api"). Playwright's
 * `baseURL` option follows WHATWG URL resolution: a leading-slash path like
 * '/auth/login' is an *absolute-path reference*, which discards the base
 * URL's own path entirely (resolves to the origin + '/auth/login', silently
 * dropping '/api'). Every call site in this suite uses leading-slash paths
 * (e.g. `api.raw.post('/auth/login', ...)`), so instead of touching every
 * spec file, this wrapper does plain string concatenation itself and never
 * passes `baseURL` to Playwright at all. A plain delegating object (not a
 * Proxy) — Playwright's internal client classes use private (#) fields that
 * break when accessed through a Proxy's `this`-changing indirection.
 */
function withApiBase(ctx: APIRequestContext): APIRequestContext {
  const wrapped: any = {
    get: (url: string, options?: any) => ctx.get(`${API_BASE_URL}${url}`, options),
    post: (url: string, options?: any) => ctx.post(`${API_BASE_URL}${url}`, options),
    put: (url: string, options?: any) => ctx.put(`${API_BASE_URL}${url}`, options),
    patch: (url: string, options?: any) => ctx.patch(`${API_BASE_URL}${url}`, options),
    delete: (url: string, options?: any) => ctx.delete(`${API_BASE_URL}${url}`, options),
    head: (url: string, options?: any) => ctx.head(`${API_BASE_URL}${url}`, options),
    fetch: (url: string, options?: any) => ctx.fetch(`${API_BASE_URL}${url}`, options),
    dispose: (options?: any) => ctx.dispose(options),
    storageState: (options?: any) => ctx.storageState(options),
  };
  return wrapped as APIRequestContext;
}

// server/index.js applies a real rate limiter to /api/auth and
// /api/admin/auth (20 requests / 15 min — intentional brute-force
// protection, not something this suite weakens). Dozens of spec-file helpers
// each log in fresh via ApiClient.login()/.adminLogin() as a setup step
// rather than reusing a token, which was blowing through that budget and
// cascading into unrelated failures. Caching per (email, password) for the
// lifetime of this worker process — tokens are valid 24h server-side, far
// longer than any single test run — cuts real login traffic to ~1 request
// per distinct account instead of one per call site, transparently, with no
// spec-file changes needed.
const loginCache = new Map<string, LoginResult>();

/**
 * Thin wrapper around a real REST call to the app's own API — used for test
 * DATA SETUP ONLY (creating a patient/referral/appointment/etc. as a
 * precondition for a UI test), never to fake a result the UI assertion
 * relies on. See playwright.config.ts header comment for the full policy.
 */
export class ApiClient {
  private constructor(private ctx: APIRequestContext, private token?: string) {}

  static async create(token?: string): Promise<ApiClient> {
    const raw = await request.newContext({
      extraHTTPHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return new ApiClient(withApiBase(raw), token);
  }

  async dispose() {
    await this.ctx.dispose();
  }

  // ── Auth ─────────────────────────────────────────────────────────────────

  async login(email: string, password: string): Promise<LoginResult> {
    const cacheKey = `user:${email}`;
    const cached = loginCache.get(cacheKey);
    if (cached) return cached;

    const res = await this.ctx.post('/auth/login', { data: { email, password } });
    if (!res.ok()) {
      throw new Error(`Login failed for ${email}: ${res.status()} ${await res.text()}`);
    }
    const body = await res.json();
    const result = { token: body.token, user: body.user };
    loginCache.set(cacheKey, result);
    return result;
  }

  async adminLogin(email: string, password: string): Promise<LoginResult> {
    const cacheKey = `admin:${email}`;
    const cached = loginCache.get(cacheKey);
    if (cached) return cached;

    const res = await this.ctx.post('/admin/auth/login', { data: { email, password } });
    if (!res.ok()) {
      throw new Error(`Admin login failed for ${email}: ${res.status()} ${await res.text()}`);
    }
    const body = await res.json();
    const result = { token: body.token, user: body.user };
    loginCache.set(cacheKey, result);
    return result;
  }

  // ── Patients ─────────────────────────────────────────────────────────────

  async createPatient(overrides: Record<string, any> = {}): Promise<any> {
    const res = await this.ctx.post('/patients', {
      data: {
        name: overrides.name,
        dateOfBirth: overrides.dateOfBirth || '1980-01-01',
        gender: overrides.gender || 'female',
        contactInfo: overrides.contactInfo || { email: `${overrides.name}@example.com`.replace(/\s+/g, '.').toLowerCase(), phone: '555-0100' },
        insuranceInfo: overrides.insuranceInfo || { provider: 'Blue Cross Blue Shield', policyNumber: 'BC-000000' },
        medicalHistory: overrides.medicalHistory || [{ condition: 'Hypertension', diagnosedDate: '2020-01-01', notes: 'Controlled' }],
        medications: overrides.medications || [],
        allergies: overrides.allergies || [],
      },
    });
    if (!res.ok()) throw new Error(`createPatient failed: ${res.status()} ${await res.text()}`);
    const body = await res.json();
    return body.data;
  }

  async getPatients(params: Record<string, string> = {}): Promise<any[]> {
    const res = await this.ctx.get('/patients', { params });
    if (!res.ok()) throw new Error(`getPatients failed: ${res.status()} ${await res.text()}`);
    const body = await res.json();
    return body.patients || [];
  }

  // ── Referrals ────────────────────────────────────────────────────────────

  async createReferral(overrides: Record<string, any>): Promise<any> {
    const res = await this.ctx.post('/referrals', {
      data: {
        patientId: overrides.patientId,
        receivingProviderId: overrides.receivingProviderId,
        reason: overrides.reason,
        urgency: overrides.urgency || 'routine',
        notes: overrides.notes || '',
        attachedRecords: overrides.attachedRecords || [],
      },
    });
    if (!res.ok()) throw new Error(`createReferral failed: ${res.status()} ${await res.text()}`);
    const body = await res.json();
    return body.data;
  }

  async setReferralStatus(referralId: string, status: string, extra: Record<string, any> = {}): Promise<any> {
    const res = await this.ctx.put(`/referrals/${referralId}/status`, { data: { status, ...extra } });
    if (!res.ok()) throw new Error(`setReferralStatus(${status}) failed: ${res.status()} ${await res.text()}`);
    return (await res.json()).data;
  }

  // ── Appointments ─────────────────────────────────────────────────────────

  async bookAppointment(overrides: Record<string, any>): Promise<any> {
    const res = await this.ctx.post('/appointments', {
      data: {
        providerId: overrides.providerId,
        providerName: overrides.providerName || 'Dr. John Smith',
        providerSpecialty: overrides.providerSpecialty || 'Cardiology',
        organizationName: overrides.organizationName || 'Metro Heart Institute',
        patientId: overrides.patientId,
        patientName: overrides.patientName,
        patientEmail: overrides.patientEmail || 'patient@example.com',
        patientPhone: overrides.patientPhone || '555-0100',
        appointmentType: overrides.appointmentType || 'follow_up',
        scheduledDate: overrides.scheduledDate,
        startTime: overrides.startTime,
        endTime: overrides.endTime,
        durationMinutes: overrides.durationMinutes || 30,
        location: overrides.location || 'in_person',
        chiefComplaint: overrides.chiefComplaint,
        reasonForVisit: overrides.reasonForVisit || '',
        notes: overrides.notes || '',
        ...(overrides.linkedReferralId ? { linkedReferralId: overrides.linkedReferralId } : {}),
      },
    });
    if (!res.ok()) throw new Error(`bookAppointment failed: ${res.status()} ${await res.text()}`);
    return (await res.json()).data;
  }

  async getAvailableSlots(providerId: string, startDate: string, endDate: string): Promise<any[]> {
    const res = await this.ctx.get('/appointments/available-slots', { params: { providerId, startDate, endDate } });
    if (!res.ok()) throw new Error(`getAvailableSlots failed: ${res.status()} ${await res.text()}`);
    const body = await res.json();
    return body.data?.slots || [];
  }

  async setAppointmentStatus(id: string, status: string, extra: Record<string, any> = {}): Promise<any> {
    const res = await this.ctx.put(`/appointments/${id}/status`, { data: { status, ...extra } });
    if (!res.ok()) throw new Error(`setAppointmentStatus(${status}) failed: ${res.status()} ${await res.text()}`);
    return (await res.json()).data;
  }

  // ── Prior Authorization ──────────────────────────────────────────────────

  async createPriorAuth(overrides: Record<string, any>): Promise<any> {
    const res = await this.ctx.post('/prior-auth', {
      data: {
        patientId: overrides.patientId,
        patientName: overrides.patientName,
        serviceType: overrides.serviceType || 'MRI Scan',
        clinicalNotes: overrides.clinicalNotes || 'Patient presents with persistent symptoms requiring imaging for accurate diagnosis and treatment planning.',
        urgency: overrides.urgency || 'Routine',
        diagnosisCodes: overrides.diagnosisCodes || [],
        insurancePlan: overrides.insurancePlan || 'Blue Cross Blue Shield',
      },
    });
    if (!res.ok()) throw new Error(`createPriorAuth failed: ${res.status()} ${await res.text()}`);
    return (await res.json()).data;
  }

  // ── Tokens ───────────────────────────────────────────────────────────────

  async getTokenBalance(): Promise<number> {
    const res = await this.ctx.get('/tokens/balance');
    if (!res.ok()) throw new Error(`getTokenBalance failed: ${res.status()} ${await res.text()}`);
    const body = await res.json();
    // GET /tokens/balance responds with { data: { tokenBalance, walletAddress } }.
    return body.data?.tokenBalance ?? 0;
  }

  // ── DTx ──────────────────────────────────────────────────────────────────

  async getDtxPrograms(params: Record<string, string> = {}): Promise<any[]> {
    const res = await this.ctx.get('/dtx/programs', { params });
    if (!res.ok()) throw new Error(`getDtxPrograms failed: ${res.status()} ${await res.text()}`);
    // GET /dtx/programs responds with { data: { programs, total, page, limit } }, not a bare array.
    return (await res.json()).data?.programs || [];
  }

  async createDtxPrescription(overrides: Record<string, any>): Promise<any> {
    const res = await this.ctx.post('/dtx/prescriptions', {
      data: {
        programId: overrides.programId,
        patientName: overrides.patientName,
        patientId: overrides.patientId || '',
        clinicalNotes: overrides.clinicalNotes || '',
      },
    });
    if (!res.ok()) throw new Error(`createDtxPrescription failed: ${res.status()} ${await res.text()}`);
    return (await res.json()).data;
  }

  async setDtxPrescriptionStatus(id: string, status: string, extra: Record<string, any> = {}): Promise<Response> {
    return this.ctx.put(`/dtx/prescriptions/${id}/status`, { data: { status, ...extra } }) as unknown as Promise<Response>;
  }

  // ── Notifications ────────────────────────────────────────────────────────

  async getNotifications(): Promise<any[]> {
    const res = await this.ctx.get('/notifications', { params: { limit: '100' } });
    if (!res.ok()) throw new Error(`getNotifications failed: ${res.status()} ${await res.text()}`);
    return (await res.json()).data || [];
  }

  /** Generic escape hatch for scenarios that need a call not wrapped above. */
  get raw(): APIRequestContext {
    return this.ctx;
  }
}
