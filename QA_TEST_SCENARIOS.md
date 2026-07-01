# ClinicTrust AI — End-to-End QA Test Scenarios

Manual test scenarios for the Provider portal (`/app/*`) and Admin portal (`/admin/*`), for manual QA execution and as a source for Playwright automation. **Every scenario below was verified against the actual source code** (client pages, server routes, and Mongoose models) — exact button labels, field names, status enums, and validation rules are quoted from the code, not assumed. Where verification surfaced a real defect, it was fixed in this codebase before this document was finalized (see the [Defects Found and Fixed](#defects-found-and-fixed-during-verification) section), so every scenario below describes intended, working behavior — not a workaround for a known bug.

## Scope & rules for every scenario in this document

- **In-app functionality only.** Every "Expected Result" is observable inside ClinicTrust AI itself — never "check an inbox," "confirm an SMS arrived," or "confirm Azure OpenAI's exact wording." Where a feature calls a third-party service (Azure OpenAI, Azure Speech, Gmail/SendGrid, Twilio, Azure Notification Hubs, Polygon), the scenario tests that the app behaves correctly regardless of whether that service is configured — the UI must show a sensible result either way, never a crash or an infinite spinner.
- **Demo accounts** (`README.md` → Demo Accounts, password `Demo1234!` for all): providers `john.smith@clinictrustai.com`, `michael.chen@clinictrustai.com`, `robert.williams@clinictrustai.com`, `sarah.johnson@clinictrustai.com`; admin `admin@clinictrustai.com`.
- **Priority key:** `P0` = must pass before any release, `P1` = high-value functional path, `P2` = edge case / secondary path.
- 🛠 marks a scenario covering a defect found and fixed during this verification pass — the highest-risk area for regression.

---

## Defects Found and Fixed During Verification

| # | Defect | Fix |
|---|---|---|
| 1 | `AdminRoute` in `App.js` checked `role !== 'admin'` only, locking superadmin accounts out of every `/admin/*` page even though the server correctly allows both `admin` and `superadmin` | Client check now matches server: `!['admin','superadmin'].includes(role)` |
| 2 | Admin Appointments "Mark Completed" / "Mark No-Show" / "Cancel" called `PUT /admin/appointments/:id/status`, which doesn't exist (404) | Client now calls the real endpoints: `PUT /appointments/:id/status` (already admin-aware) for completed/no-show, `PUT /appointments/:id/cancel` for cancel |
| 3 | "Reschedule" always created a brand-new appointment via `bookAppointment()` — the original appointment was never touched, silently leaving a duplicate | `BookAppointment.js` now detects `?reschedule=<id>`, loads the original, and calls `rescheduleAppointment()` on submit |
| 4 | Prior Authorization clinical-notes minimum length (20 characters) and DTx prescription status-transition/completion-field rules were enforced client-side only — a direct API call could bypass them | Both rules are now also enforced server-side in `priorAuth.js` and `dtx.js` |
| 5 | Admin AI Configuration screen lets an admin edit `priorAuth.autoApproveThreshold`, but the Prior Auth auto-approval logic never read it — always used a hardcoded `0.92` | `isEligibleForAutoApproval()` now reads the configured threshold (falling back to `0.92` if unset) |
| 6 | Admin Referrals "Has Dispute" filter and the Dispute column were non-functional (state declared, never applied; column hardcoded to "None") despite a real `ReferralDispute` model with seeded data | List endpoint now attaches dispute presence per referral; filter and column both work |
| 7 | Admin Referrals "Workflow Settings" save posted the raw settings object to a generic upsert endpoint expecting `{value, category}` — silently saved nothing usable, and settings were never re-loaded on page visit | Save now wraps the payload correctly; settings are fetched on mount |
| 8 | FHIR R4 API (`/api/fhir/*`) had zero patient-level authorization — any authenticated user could fetch any patient's Condition/MedicationRequest/AllergyIntolerance/Coverage/ServiceRequest data, inconsistent with every other patient-data route in the app | Added the same access check used elsewhere (primary provider, admin, referral-granted access, or consent) to every patient-scoped FHIR route |

---

## Part A — Provider Portal

### A1. Registration

Registration is a 3-step wizard, not a single form.

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| A1-01 | P0 | Register via NPI lookup | Go to `/register`. Select role chip (`doctor`/`clinic`/`hospital`/`lab`). Enter a valid, unregistered 10-digit NPI. Click **"Look Up"**. | A success card shows the NPI holder's name, credential, specialty, city, state. Click **"Yes, that's me — Continue"** to advance to Step 1 with fields pre-filled. |
| A1-02 | P1 | NPI lookup with invalid format | Enter fewer or more than 10 digits and click "Look Up". | Error: "NPI must be exactly 10 digits" — request is not sent. |
| A1-03 | P1 | NPI lookup for an NPI not in NPPES | Enter a syntactically valid but non-existent 10-digit NPI. | Error: "NPI not found in the NPPES registry" (HTTP 404 surfaced as a message, not a crash). |
| A1-04 | P0 | NPI already registered and verified | Look up an NPI belonging to an existing, fully verified account. | Warning card: "This NPI is already registered and verified. Please sign in." with a "Sign In" button — no duplicate account is created. |
| A1-05 | P1 | NPI already registered, pending email verification | Look up an NPI whose account is mid-registration (`pending_email`). | Message: "This NPI is already registered. Please check your email to verify." with a "Sign In & Verify Email" button. |
| A1-06 | P1 | Skip NPI lookup for non-doctor roles | Select role chip `clinic`, `hospital`, or `lab`. | A "Skip NPI lookup" option is available, advancing straight to Step 1 (Account Setup). |
| A1-07 | P0 | Complete Step 1 — Account Setup | Fill first/last name, email, organization, password (≥8 chars), confirm password. Submit. | Password strength meter shows level (Too short/Fair/Strong). On submit with a unique email: account created, JWT + user returned, message "Registration successful. Please check your email to verify your account." — advances to Step 2. |
| A1-08 | P0 | Register with a duplicate email | Use an email already registered. | Server rejects: "Email already registered" (HTTP 400); no account created. |
| A1-09 | P0 | Register with password under 8 characters | Enter a 6-7 character password. | Rejected: "Password must be at least 8 characters" (enforced both client-side and server-side). |
| A1-10 | P1 | Register with an NPI already used by another account | Complete Step 1 with an NPI that's already registered under a different email. | Rejected (HTTP 400) with an `npiStatus`-specific message; no duplicate created. |
| A1-11 | P0 | Step 2 — verification screen | After successful registration. | Shows "Check your inbox", the registered email in bold, a "Didn't receive it? Resend" button with a 60-second cooldown, and a "Go to Sign In" link. |
| A1-12 | P1 | Resend verification email cooldown | Click "Resend" once, then attempt again immediately. | Button shows a live countdown (e.g. "Resend in 59s…") and is disabled until it reaches 0. |
| A1-13 | P0 | Verify email via link | Use a valid, unexpired verification token (`GET /api/auth/verify-email?token=...`). | Email marked verified; `onboardingStatus` becomes `profile_incomplete`; response: "Email verified successfully." |
| A1-14 | P1 | Verify email with an expired/invalid token | Use a tampered or expired token. | Rejected: "Invalid or expired verification link. Please request a new one." (HTTP 400). |

### A2. Login, Logout, Session

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| A2-01 | P0 | Successful login | On `/login`, enter a valid demo provider's email + `Demo1234!`. Submit. | Redirected to `/app/dashboard` if `accountStatus === 'approved'` and `onboardingStatus === 'verified'`; otherwise redirected to `/onboarding`. |
| A2-02 | P0 | Login with wrong password | Valid email, wrong password. | "Invalid credentials" (HTTP 401) — same generic message as a nonexistent email (no account-enumeration difference). |
| A2-03 | P1 | Login with nonexistent email | Any email not in the system. | Same "Invalid credentials" message as A2-02. |
| A2-04 | P1 | Account lockout after repeated failures | Submit the wrong password 5 times for one account within 15 minutes. | Further attempts are blocked: "Account locked due to too many failed attempts. Try again in {N} minute(s)." (HTTP 429). |
| A2-05 | P1 | Login to a suspended account | Attempt login on an account with `accountStatus: 'suspended'`. | "Your account has been suspended. Please contact support." (HTTP 403). |
| A2-06 | P1 | Login to a rejected account | Attempt login on an account whose KYC/onboarding was rejected by admin. | "Your account application was not approved. Reason: {kycRejectionReason}" (HTTP 403). |
| A2-07 | P0 | Login to a deactivated account 🛠 | Attempt login on an account with `isActive: false` (see B11-04). | "Your account is inactive. Please contact your administrator." (HTTP 403) — login is genuinely blocked, not just cosmetically. |
| A2-08 | P0 | Logout | Click Logout while authenticated. | Token + user cleared from storage; navigating to any `/app/*` route redirects to `/login`. |
| A2-09 | P0 | Session persists across refresh | Refresh the browser on any `/app/*` page while logged in. | Still logged in (no forced re-login) as long as the token hasn't expired. |
| A2-10 | P1 | Forgot password | On `/login`, click "Forgot password?", submit a registered email. | Always returns the same generic message: "If your email is registered, you will receive a password reset link" — regardless of whether the email exists. |
| A2-11 | P1 | Reset password with a valid token | Use a valid reset token (JWT signed with `JWT_RESET_SECRET`, 1-hour expiry) to set a new password (≥8 chars). | "Password reset successful"; old password no longer works; new password logs in. |
| A2-12 | P1 | Reset password with an expired/invalid token | Use a tampered or expired token. | "Invalid or expired token" (HTTP 400); password unchanged. |
| A2-13 | P1 | Change password from Settings | Settings → Security tab → Change Password → enter correct current password + a new password ≥8 chars matching confirmation. | "Password changed successfully"; logging out and back in with the new password works. |
| A2-14 | P1 | Change password with wrong current password | Enter an incorrect current password. | "Current password is incorrect" (HTTP 401); password unchanged. |
| A2-15 | P1 | Change password with a weak new password | Enter a new password scoring below the strength minimum (no uppercase/numbers/symbols). | Blocked client-side: "Password is too weak. Add uppercase letters, numbers, or symbols." |

### A3. Onboarding / KYC (Provider Side)

The onboarding wall (`/onboarding`) is a 4-step timeline: **Account Created** (auto-done) → **Verify Your Email** → **Complete Your Profile** → **Upload Verification Documents**.

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| A3-01 | P0 | New provider sees the onboarding wall | Log in as a freshly registered, unverified provider. | Redirected to `/onboarding`; cannot reach `/app/*` pages; header shows "Complete Your Setup" with a progress ring and "{N} steps remaining before full access." |
| A3-02 | P0 | Complete Step 2 — Profile Setup | Click "Get Started" on "Complete Your Profile" → `/onboarding/profile`. Select ≥1 specialty, enter phone (both required), fill other fields, save. | Success: "Profile saved! Please upload your verification documents."; `kycStatus` becomes `doc_pending`; auto-redirects to `/onboarding` after ~1.8s. |
| A3-03 | P1 | Profile Setup — validation | Attempt to save with no specialty selected, or with phone empty. | Blocked: "Please select at least one specialty." / "Phone number is required." |
| A3-04 | P0 | Upload KYC document — PDF | Click "Upload Now" → dialog. Enter license number (required), optionally license state, upload a valid PDF ≤5MB. Submit. | Upload succeeds; `kycStatus` becomes `under_review`; message: "Documents submitted. Our team will review within 1-2 business days." |
| A3-05 | P0 | Upload KYC document — JPG/PNG | Same as A3-04 with a JPG or PNG image. | Succeeds identically. |
| A3-06 | P1 | Reject disallowed file type | Attempt to upload a `.docx` or `.exe`. | Rejected: "Only PDF, JPG, and PNG files are allowed." |
| A3-07 | P1 | Reject oversized file | Attempt to upload a file over 5MB. | Rejected with a clear file-size error. |
| A3-08 | P1 | Submit KYC documents without a license number | Leave license number blank, submit. | Rejected: "License number is required" (HTTP 400). |
| A3-09 | P0 | Status reflects submitted KYC | After A3-04, reload the onboarding wall. | Status badge shows "Under Review — 1-2 business days"; user still cannot access `/app/*` until admin approval (see B2). |
| A3-10 | P0 | Verified user is auto-redirected | Once admin approves KYC (B2-02) and the user's session refreshes. | Onboarding wall auto-redirects to `/app/dashboard` — no manual navigation needed. |
| A3-11 | P1 | Resend verification email from onboarding wall | Click "Resend Email" on the "Verify Your Email" step. | Cooldown-gated resend, same 60s pattern as A1-12; in-app confirmation only. |

### A4. Dashboard

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| A4-01 | P0 | Dashboard loads (Overview tab) | Go to `/app/dashboard`. | Greeting "Welcome, {firstName}"; 4 stat cards (Total Patients, Pending Referrals, Care Quality Index, Token Balance) render with real values, not placeholders. |
| A4-02 | P1 | Refresh button re-fetches | Click the header refresh icon. | Spinner shows briefly; data reloads to reflect current state. |
| A4-03 | P0 | Stat card navigation | Click each of the 4 stat cards. | Total Patients → `/app/patients`; Pending Referrals → `/app/referrals?status=pending`; Care Quality Index → `/app/analytics/care-quality`; Token Balance → `/app/tokens`. |
| A4-04 | P0 | Quick Action buttons navigate correctly | Click each of the 6 quick-action buttons. | **"Add Patient"** → `/app/patients/add`; **"Create Referral"** → `/app/referrals/create`; **"New Analysis"** → `/app/analytics/create`; **"Schedule Patient"** → `/app/appointments/book`; **"DTx Marketplace"** → `/app/dtx/marketplace`; **"Transfer Tokens"** → `/app/tokens/transfer`. |
| A4-05 | P1 | Today's Schedule panel | With at least one appointment today. | Up to 6 shown as cards (patient, status chip, time range, type + chief complaint); **"Full Schedule"** button → `/app/schedule`. |
| A4-06 | P1 | Today's Schedule empty state | With zero appointments today. | "No appointments scheduled for today" with a "Schedule a Patient" button. |
| A4-07 | P1 | Recent Activity panel | With recent platform activity. | List of activity items with icons by type (referral/patient/analytics/token); **"View All Activity"** → `/app/activity`. |
| A4-08 | P1 | Tab switching | Click through "Patient Analytics", "Referral Metrics", "Clinical Outcomes", "AI Performance" tabs. | Each renders its own charts; tabs with no analytics data yet show: "No analytics data yet. Ask your admin to run the Analytics Job…" rather than erroring. |
| A4-09 | P2 | New provider empty state | Log in as a provider with zero patients/referrals. | All widgets show sensible empty states, no `NaN`/`undefined` rendered anywhere. |

### A5. Patients 🛠

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| A5-01 | P0 | Patients grid loads | Go to `/app/patients`. | Columns: Patient ID, Name, Age / Gender, Contact, Conditions, Risk Level, Last Updated, Actions. |
| A5-02 | P1 | Gender-specific avatar icon 🛠 | Observe the avatar next to each patient's name. | Male → blue "Man" icon; Female → pink "Woman" icon; other/unspecified → generic person icon. |
| A5-03 | P1 | Conditions column | View a patient with 2+ medical history entries. | First condition shown as a chip; "+N" chip for the rest; hover shows remaining condition names in a tooltip. |
| A5-04 | P0 | Search patients | Type a known patient's name/ID/email fragment. | Grid filters to matches only; clearing restores the full list. |
| A5-05 | P0 | Filter by Risk Level 🛠 | Filter menu → "High Risk" (score ≥70), then "Medium" (30–69), then "Low" (<30). | Grid shows only matching patients each time; "All" resets. |
| A5-06 | P0 | Filter by Gender 🛠 | Filter menu → Male / Female / Other. | Grid narrows correctly (case-insensitive exact match); "All" resets. |
| A5-07 | P1 | Combined search + filters | Apply a search term and a risk/gender filter together. | Both apply as AND, not OR. |
| A5-08 | P1 | Clear Filters | With filters active, click "Clear Filters". | Search clears; filters reset to "All"; sort resets to Name ascending. |
| A5-09 | P0 | Sort by Name 🛠 | Click the "Name" column header. | Sorts ascending; click again toggles descending; arrow indicator updates. |
| A5-10 | P1 | Sort by Age/Gender 🛠 | Click "Age / Gender" header. | Sorts by date of birth; direction toggles. |
| A5-11 | P1 | Sort by Risk Level 🛠 | Click "Risk Level" header. | Sorts by underlying risk score; direction toggles. |
| A5-12 | P1 | Sort by Last Updated 🛠 | Click "Last Updated" header. | Sorts by the record's update timestamp; direction toggles. |
| A5-13 | P0 | Pagination | With more patients than one page. | Rows-per-page selector and page nav both work; changing page size resets to page 1. |
| A5-14 | P0 | Add Patient | Click "Add Patient"; complete the multi-step form (name, DOB, gender, contact, ≥1 condition/med/allergy entry); submit. | New patient appears in the grid, immediately searchable; primary provider set to the creator. |
| A5-15 | P1 | Add Patient — validation | Submit with a required field missing at any step. | Step-level validation blocks progression with a clear field error. |
| A5-16 | P0 | View patient detail | Click a patient row. | Navigates to that patient's detail page with correct data. |
| A5-17 | P0 | Primary Provider shown as resolved name 🛠 | Open a patient's detail page. | "Primary Provider" shows the provider's real name (e.g. "Dr. John Smith"), with specialty · organization underneath — never a raw ID string. |
| A5-18 | P0 | Row menu → Create Referral, patient pre-selected 🛠 | Row "⋮" menu → "Create Referral." | Navigates to `/app/referrals/create`; Step 1's "Select Patient" field is already filled — no re-search needed. |
| A5-19 | P0 | Row menu → Schedule Appointment, patient pre-selected 🛠 | Row "⋮" menu → "Schedule Appointment." | Navigates to `/app/appointments/book` with the patient already selected. |
| A5-20 | P1 | Edit patient | From patient detail, edit a field (e.g. phone), save. | Change persists after reload. |
| A5-21 | P2 | Grant consent to another provider | From patient detail, "Grant Access" → add a consent record. | Consent record created and visible in consent history. |
| A5-22 | P1 | Export EHI as primary provider/admin | From patient detail, click "Export EHI" as the primary provider or an admin. | Export succeeds without error. |
| A5-23 | P1 | Export EHI denied for unrelated provider | Attempt EHI export as a provider with no relationship to the patient. | Denied with a clear "restricted" message — no data leak. |

### A6. Referrals 🛠

Referral status enum: `pending`, `accepted`, `completed`, `rejected`, `cancelled`. Valid transitions: `pending → accepted/rejected/cancelled`; `accepted → completed/cancelled`; `completed`/`rejected`/`cancelled` are terminal.

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| A6-01 | P0 | Referrals list loads with status tabs | Go to `/app/referrals`. | All/Pending/Accepted/Completed/Rejected/Cancelled tabs load; counts match actual data. |
| A6-02 | P0 | Create referral — manual patient search | "Create Referral" → Step 1, search for and select a patient. | Patient selected; info panel renders; Next enabled. |
| A6-03 | P0 | Create referral — patient pre-selected 🛠 | Arrive via Patients grid action menu (A5-18). | Step 1 pre-filled; provider can advance directly. |
| A6-04 | P1 | AI provider suggestions | Step 2, type a specialty (e.g. "Cardiology") and wait ~800ms. | Up to 5 ranked suggestions render with a match score, breakdown chips, and provider details; clicking one auto-fills the provider field. |
| A6-05 | P0 | Complete referral creation | Fill reason, urgency, notes on Step 3; submit. | Created with status `pending`; appears under "Pending" and "All". |
| A6-06 | P1 | Create referral — validation | Try to advance with no patient / no provider / no reason. | Step blocks with a clear message. |
| A6-07 | P0 | Accept a referral 🛠 | As the receiving provider on a `pending` referral, row menu → "Accept Referral." | Status → `accepted`; action only appears while `pending`. |
| A6-08 | P0 | Reject a referral 🛠 | On a `pending` referral, row menu → "Reject Referral." | Status → `rejected`; only appears while `pending`. |
| A6-09 | P0 | Mark referral completed 🛠 | On an `accepted` referral, row menu → "Mark as Completed." | Status → `completed`; only appears while `accepted` (not `pending`). |
| A6-10 | P1 | Row menu respects valid transitions 🛠 | Open the row menu on referrals in each status. | `pending` → Accept/Reject shown; `accepted` → Mark Completed shown; `completed`/`rejected`/`cancelled` → no status actions, only "View Details". |
| A6-11 | P0 | Detail page status update respects state | Open a `pending` referral's detail; use "Update Status." | Only Accept/Reject offered; after accepting, only Complete/Cancel are offered. |
| A6-12 | P1 | Cancel an accepted referral | On an `accepted` referral, "Update Status" → Cancel, optional notes, confirm. | Status → `cancelled`; no further status actions available. |
| A6-13 | P1 | Invalid transition is rejected | Attempt (e.g. via direct API call) to move a `completed` referral back to `accepted`. | Server rejects: "Cannot transition from completed to accepted"; status unchanged. |
| A6-14 | P1 | Search / filter / sort referrals | Search by patient/provider name; filter by status/urgency; sort by created date. | Each narrows/reorders correctly; "Reset" restores the unfiltered list. |
| A6-15 | P0 | Detail tabs render | Open a referral; click Patient Info, Billing, Attached Records, Notes tabs. | Each renders correct data with no errors. |
| A6-16 | P1 | Schedule Appointment from a referral | Referral detail → "Schedule Appointment." | Navigates to `/app/appointments/book` pre-populated with referral ID + receiving provider; created appointment links back to the referral. |
| A6-17 | P1 | Prescribe DTx from a referral | Referral detail → "Prescribe DTx" → choose a program → submit. | DTx prescription created with `linkedReferralId` set to this referral. |

### A7. Appointments & Schedule

Booking stepper: **"Patient Details"** → **"Select Time"** → **"Confirm & Schedule."** Status enum: `scheduled`, `confirmed`, `checked_in`, `in_progress`, `completed`, `cancelled`, `no_show`, `rescheduled`.

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| A7-01 | P0 | Book an appointment — full flow | `/app/appointments/book`. Step "Patient Details": select patient (via `PatientSearchAutocomplete`), enter Chief Complaint (required), Appointment Type, Location. Step "Select Time": pick a date and slot. Step "Confirm & Schedule": review, click "Confirm & Schedule Appointment." | Created with status `scheduled`; appears in "My Appointments" and the provider's schedule. |
| A7-02 | P0 | Book — patient pre-selected 🛠 | Arrive via Patients grid (A5-19) with `?patientId=`. | Patient field pre-filled; provider proceeds directly. |
| A7-03 | P1 | Book — validation | Try to advance Step 1 without Chief Complaint or patient name; or Step 2 without date+slot. | Blocked with a clear message (`validateStep` requires both). |
| A7-04 | P0 | Double-booking is prevented | Attempt to book a slot that overlaps an existing non-cancelled/non-no_show appointment for the same provider. | Rejected (HTTP 409): "This time slot is no longer available. Please select another slot." |
| A7-05 | P1 | Telehealth auto-sets location | Select Appointment Type = "Telehealth." | Location field automatically switches to "Telehealth." |
| A7-06 | P0 | My Appointments — Upcoming/Past tabs | Go to "My Appointments" (patient-facing list of appointments a provider scheduled). | Each tab shows only appointments in that time window. |
| A7-07 | P0 | Cancel an appointment | Cancel a `scheduled`/`confirmed` appointment more than 2 hours out, with a reason. | Status → `cancelled`; `cancellationReason`, `cancelledAt`, `cancelledBy` recorded. |
| A7-08 | P1 | Cancel restriction — checked-in and <2h away | Attempt to cancel an appointment that is `checked_in` and starts in under 2 hours. | Rejected: "Cannot cancel an appointment that is checked in and less than 2 hours away" (HTTP 400). |
| A7-09 | P1 | Cancel a completed/already-cancelled appointment is blocked | Attempt to cancel an appointment with status `completed` or `cancelled`. | Rejected: "Cannot cancel an appointment with status '{status}'". |
| A7-10 | P0 | Reschedule an appointment 🛠 | On an upcoming appointment, click "Reschedule." | Navigates to `/app/appointments/book?reschedule=<id>` with an info banner "Rescheduling appointment for {patient}…"; patient/complaint/type are pre-filled; pick a new date/slot and confirm. |
| A7-11 | P0 | Reschedule actually updates the original 🛠 | Complete A7-10 and check "My Appointments." | The **original** appointment now shows the new date/time and a `rescheduleHistory` entry (from/to date/time, reason, who, when) — **no duplicate appointment is created.** |
| A7-12 | P0 | Check-in / Complete workflow | On a `scheduled` appointment: Check-In, then Complete (diagnosis/outcome notes/follow-up prompted in the outcome dialog). | Status advances `scheduled → checked_in → completed`; each button only appears for its valid starting status (Check In: `scheduled`/`confirmed`; Complete: `checked_in`/`in_progress`). There is no separate UI control for `in_progress` — it's reachable only via a direct status-update call. |
| A7-13 | P1 | No-Show has no provider-side control | On an upcoming appointment, look for a "No-Show" action. | There is none — marking an appointment `no_show` is an **admin-only** action (see B7-03). Verified server-side via a direct status-update call: status → `no_show`, `noShowMarkedAt` recorded, no token reward issued. |
| A7-14 | P1 | Send appointment reminder | On an upcoming appointment, "Remind." | App records `reminderSentAt` and a `remindersSent[]` entry, and shows an in-app confirmation — regardless of whether the underlying email/SMS actually delivers. |
| A7-15 | P0 | Token reward on completion | Complete an appointment (A7-12); check token balance before/after. | Balance increases by 15 (or the configured `appointmentCompleted` policy value); `tokenRewardIssued` becomes true; repeating completion does not double-award. |
| A7-16 | P1 | Linked referral auto-closes on completion | Complete an appointment that has a `linkedReferralId`. | The linked referral's status becomes `completed` with a `completionDate` set. |
| A7-17 | P1 | Set weekly availability | Provider Schedule → "Manage Availability" tab. Toggle a day active, set Start/End Time and Slot Duration (15/20/30/45/60 min), Save. | Saved availability persists after reload; time slots on that day reflect it. |
| A7-18 | P1 | Add a schedule exception | "Exceptions" tab → Add Exception: date, Type (Unavailable All Day / Extra Hours / Modified Hours), Reason, optional notes. | Exception saved; if "Unavailable All Day," no slots are offered for that date. |
| A7-19 | P2 | Delete a schedule exception | Remove a previously added exception. | Exception removed; availability reverts to the standard weekly pattern for that date. |

### A8. Tokens

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| A8-01 | P0 | Token dashboard loads | `/app/tokens`. | Current balance and transaction history render correctly. |
| A8-02 | P0 | Transfer tokens | Click "Transfer" → "Transfer Tokens" page → select a recipient (not self), enter amount ≤ balance, optional note, submit. | Sender's balance decreases by the amount; recipient's increases; appears in transaction history. |
| A8-03 | P0 | Transfer — insufficient balance | Attempt to transfer more than the current balance. | Rejected with a clear message; balance unchanged. |
| A8-04 | P0 | Transfer — cannot target self | Attempt to select yourself as recipient. | Blocked — recipient list excludes the current user. |
| A8-05 | P1 | Transfer — validation | Submit with no recipient, or amount ≤0. | Blocked with clear validation. |
| A8-06 | P0 | Redeem tokens | Click "Redeem" → "Redeem Tokens" page → select a catalog service costing ≤ balance, confirm. | Balance decreases by the service's token cost; appears in transaction history. |
| A8-07 | P0 | Redeem — insufficient balance | Attempt to redeem a service costing more than the balance. | Rejected with a clear message; balance unchanged. |
| A8-08 | P1 | Earn sources list | View "Ways to Earn Tokens." | Renders earn sources (complete referral, accept referral, KYC verified, etc.) with token amounts. |
| A8-09 | P1 | Transaction detail | Click into a specific transaction. | Correct type, amount, reason, resulting balance, related entity shown. |
| A8-10 | P2 | Balance updates after an earning event | Complete a token-earning action (e.g. complete a referral); return to Token dashboard. | New balance and a matching new "earn" transaction appear. |

### A9. Notifications 🛠

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| A9-01 | P0 | Notifications load real data 🛠 | Open `/app/notifications`. | Real notifications for the logged-in user load — title, message, type, timestamp. |
| A9-02 | P0 | Mark as read persists 🛠 | Mark an unread notification as read; reload the page. | Shows as read immediately **and after reload**. |
| A9-03 | P0 | Delete persists 🛠 | Delete a notification; reload. | Disappears immediately and does **not** reappear after reload. |
| A9-04 | P0 | Mark All as Read persists 🛠 | With multiple unread, click "Mark All as Read"; reload. | All show read both immediately and after reload; button disables once nothing is unread. |
| A9-05 | P1 | Unread / High Priority / Read tabs | Switch tabs. | Unread → only unread; High Priority → only `high`/`critical`; Read → only previously-read. |
| A9-06 | P1 | Clicking a notification with a link navigates | Click a notification referencing a referral/token/report. | Navigates to the related page; marks it read as a side effect. |
| A9-07 | P2 | Action icons don't trigger navigation | Click the mark-read/delete icon buttons specifically. | Only the intended action fires — no unwanted navigation. |

### A10. Blockchain History 🛠

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| A10-01 | P0 | Page loads real, user-scoped data 🛠 | `/app/blockchain/history` as a provider with referral/token activity. | Table shows only transactions this user actually participated in — never empty when data exists, never another user's transactions. |
| A10-02 | P1 | Transaction types render distinctly | Observe the "Event" column. | Referral created/accepted/rejected/completed, token transfer/reward events labeled and color-coded distinctly. |
| A10-03 | P1 | Search / filter transactions | Search by hash/event/address; filter by event type/status. | Narrows correctly; "Clear Filters" resets. |
| A10-04 | P0 | View transaction detail 🛠 | Click a row's "view details" icon. | Detail page loads with correct block number, from/to, timestamp, status — no 404. |
| A10-05 | P0 | Cannot view another user's private transaction 🛠 | As Provider A, attempt to open a transaction detail belonging only to Providers B and C. | Access denied (403) — Provider A is not a participant. |
| A10-06 | P1 | Copy transaction hash | Click the copy icon. | Correct value copied; "Copied!" confirmation shown. |
| A10-07 | P2 | Empty state for a new provider | Log in as a provider with no blockchain activity yet. | Clean empty state, not an error. |

### A11. Profile 🛠

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| A11-01 | P0 | Profile loads real user data 🛠 | `/app/profile`. | Name, email, organization, specialty, phone, address, bio match the actual logged-in user. |
| A11-02 | P0 | Edit and save profile | Edit → change a field → Save. | Persists after reload; success confirmation shown. |
| A11-03 | P1 | Cancel discards changes | Edit → change a field → Cancel. | Field reverts; nothing persisted. |
| A11-04 | P0 | Start blockchain verification 🛠 | As an unverified user, "Verify Identity" → "Start Verification." | Succeeds; panel updates to "Verified" with a real (non-empty) Blockchain ID and Wallet Address, no manual reload needed. |
| A11-05 | P1 | Copy Blockchain ID / Wallet Address | Click each copy icon. | Correct value copied; confirmation shown. |
| A11-06 | P2 | Re-verify an already-verified user | Trigger verification again on a verified account. | Returns "already verified" without creating a duplicate identity. |

### A12. Analytics 🛠

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| A12-01 | P0 | Analytics dashboard loads | `/app/analytics`. | Reports list, insights, predictive alerts, provider benchmarking all render. |
| A12-02 | P0 | Create a new analytics report | "New Analysis" → fill name, type, description, data sources, date range → submit. | Created with status `processing`/`pending`; appears in the list; reaches `completed` within a reasonable wait. |
| A12-03 | P0 | View a completed report | "View Full Report" on a completed report/insight. | Navigates to the report detail page with correct data. |
| A12-04 | P1 | Reports list filter tabs | Switch All/Completed/In Progress. | Filters correctly per tab. |
| A12-05 | P0 | Take Action on a predictive alert with a linked report 🛠 | Open an alert's detail dialog → "Take Action." | Navigates to the linked analytics report's detail page. |
| A12-06 | P0 | Take Action on an alert with no linked report 🛠 | Same, on an alert with no linked report. | A clear in-app message states there's no linked report to open — never a silent no-op. |
| A12-07 | P1 | Close alert details without acting | Open dialog → "Close." | Closes with no side effects. |

### A13. Prior Authorization

Create-form steps: **"Patient & Service"** → **"Clinical Details"** → **"Review & Submit."** Status enum: `Pending`, `Under Review`, `Approved`, `Denied`, `Appealing`, `Expired` (exact casing).

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| A13-01 | P0 | PA list loads | `/app/prior-auth`. | List loads with correct statuses. |
| A13-02 | P0 | Create a PA request | "New Request" → select patient, Service Type (required); Step 2: Clinical Notes ≥20 characters (required), optional diagnosis codes; Step 3: review, "Submit Request." | Created with status `Pending`; async AI analysis triggers; eventually reaches `Approved`/`Under Review`. |
| A13-03 | P0 | Clinical notes under 20 characters is rejected 🛠 | Enter fewer than 20 characters (bypassing the UI counter, e.g. via a direct API call) and submit. | Rejected server-side: "Clinical notes must be at least 20 characters" (HTTP 400) — this is enforced on the server, not just the client. |
| A13-04 | P1 | Add/remove diagnosis codes | Step 2, add multiple ICD-10 codes, then remove one. | List updates correctly; removed code excluded from submission. |
| A13-05 | P0 | View PA detail | Open a PA request. | Status, diagnosis codes, urgency, history render correctly. |
| A13-06 | P1 | Add a note to a PA | On PA detail, "Clinical Notes Thread" → type and send a note. | Note appears immediately and persists after reload, attributed to the correct author/role. |
| A13-07 | P1 | View audit trail | Click "Audit Trail." | Chronological timeline of actions (Submitted, AI Analysis Complete, Approved/Denied, etc.) renders correctly. |
| A13-08 | P0 | Submit an appeal on a Denied PA | On a `Denied` PA, "Appeal" → optionally click "AI Draft" for a starting point → edit/enter Appeal Justification → "Submit Appeal." | Status → `Appealing`; `appealCount` increments; a 15-day appeal deadline is set. |
| A13-09 | P0 | Second appeal on the same PA is blocked | Attempt to submit a second appeal on a PA that already used its one appeal. | Rejected — max 1 appeal per PA is enforced server-side. |
| A13-10 | P0 | Request renewal on an Expired PA | On an `Expired` PA, "Request Renewal" → review pre-filled form (clinical notes carried over) → submit. | New PA created referencing the original (`renewedFromId`), status `Pending`. |
| A13-11 | P1 | Renewal blocked on a non-Expired PA | Attempt to renew a PA that isn't `Expired`. | Rejected: "Only Expired PAs can be renewed" (HTTP 400). |
| A13-12 | P1 | Search / filter PA list | Search by patient/service/provider; filter by status. | List narrows correctly. |

### A14. Digital Therapeutics (DTx) Marketplace

DTx categories: Mental Health, Metabolic, Musculoskeletal, Cardiovascular, Behavioral, Respiratory, Neurology (+ "All Programs"). Prescription status enum: `prescribed`, `enrolled`, `active`, `completed`, `dropped`. Valid transitions: `prescribed→enrolled/dropped`, `enrolled→active/dropped`, `active→completed/dropped`; `completed`/`dropped` are terminal.

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| A14-01 | P0 | Marketplace loads catalog | `/app/dtx/marketplace`. | Active programs render by category tab with evidence-level badges (FDA Cleared / FDA Authorized / Peer Reviewed / Evidence Based / Clinical Study). |
| A14-02 | P1 | Search / filter by evidence level | Type a program/vendor/condition name; select an evidence level. | Catalog narrows correctly. |
| A14-03 | P0 | Prescribe a program | "Prescribe" → select a patient (required) → optional clinical notes → "Prescribe Program." | Created with status `prescribed`; program's prescription count increments. |
| A14-04 | P1 | Prescribe without a patient is blocked | Attempt to submit with no patient selected. | Blocked: "Please select a patient to prescribe this program." |
| A14-05 | P0 | Prescriptions list loads and filters by status | `/app/dtx/prescriptions`; switch status tabs (All/Prescribed/Enrolled/Active/Completed/Dropped). | Loads correctly per tab. |
| A14-06 | P0 | Update through valid lifecycle | Update `prescribed → enrolled → active → completed`, entering engagement score (0–100) + outcome notes when completing. | Each step succeeds; the UI only offers valid next statuses (via the "Update" button, which disappears once `completed`/`dropped`). |
| A14-07 | P0 | Completion requires engagement score and outcome notes 🛠 | On an `active` prescription, attempt to save "completed" without entering an engagement score, or without outcome notes. | Rejected (both client-side and now server-side): "Engagement score is required to complete a prescription" / "Outcome notes are required to complete a prescription." |
| A14-08 | P0 | Invalid status jump is rejected 🛠 | Attempt (e.g. via direct API call) to move a `prescribed` prescription straight to `completed`. | Rejected server-side: "Cannot transition from 'prescribed' to 'completed'" (HTTP 400) — was previously only blocked by the UI. |
| A14-09 | P0 | Token reward on completion | Complete a prescription (A14-06); check balance before/after. | Balance increases by the program's `tokenReward` (or policy default, 10); `tokenRewardIssued` becomes true. |
| A14-10 | P1 | No reward on drop | Transition an `enrolled`/`active` prescription to `dropped`. | Status updates; **no** token reward issued. |

### A15. Ambient Clinical Intelligence

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| A15-01 | P0 | Start a recording session | `/app/ambient`. Select patient, chief complaint, Next, "Start Recording" (grant mic permission). | Live transcript appears and updates as you speak (browser Web Speech API). |
| A15-02 | P0 | Stop recording and submit for analysis | Speak a sentence, "Stop Recording," then "Submit for AI Analysis." | Button may briefly show "Finalizing transcript…" (server-side re-transcription attempt) before re-enabling; submission proceeds to Step 3 with clinical content generated (mock or real, either acceptable). |
| A15-03 | P1 | Recording works without microphone permission | Deny mic access (or use a browser without Web Speech API). | Clear "not supported"/permission message; controls disable gracefully — no unhandled crash. |
| A15-04 | P0 | Review and edit AI-generated content | Step 3: edit clinical summary, referral note draft, urgency classification. | Edits reflected in the form; nothing lost until Approve/Reject. |
| A15-05 | P0 | Approve a session | Step 3 → "Approve." | Status → `approved`; success message shown; edit history records the change. |
| A15-06 | P0 | Reject a session | Step 3 → "Reject." | Status → `rejected`; success message shown. |
| A15-07 | P1 | My Sessions tab | Switch to "My Sessions." | Lists the provider's own past sessions with correct status/urgency chips. |
| A15-08 | P1 | View a past session | Click into a session. | Full detail (transcript, AI content, status) renders correctly. |

### A16. FHIR Explorer

Resource tabs: **Patient**, **Conditions**, **Medications**, **Allergies**, **Coverage**, **Referrals (SR)**.

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| A16-01 | P0 | Load capability statement | `/app/fhir`. Click "Load Metadata." | FHIR capability statement renders (FHIR 4.0.1, supported resources: Patient, Practitioner, Condition, MedicationRequest, AllergyIntolerance, Coverage, ServiceRequest). |
| A16-02 | P0 | Select a patient and load resources | Select a patient from "Select Patient." | All 6 resource tabs load correctly for that patient in parallel. |
| A16-03 | P0 | Switch patient re-fetches all tabs | Select a different patient. | Old data clears; all tabs refetch for the new patient; active tab resets to "Patient." |
| A16-04 | P0 | Cannot view a patient with no relationship 🛠 | As a provider with no relationship to a given patient (not primary provider, no referral, no consent), select that patient (or call the endpoint directly with their ID). | Each resource tab shows an error state (HTTP 403, "You are not authorized to access this patient record") — not the patient's data. |
| A16-05 | P1 | Copy resource JSON | On any loaded tab, click "Copy JSON." | Correct JSON copied to clipboard; "Copied to clipboard" confirmation shown. |
| A16-06 | P1 | Refresh reloads all resources | Click the refresh icon (enabled only when a patient is selected). | All 6 tabs re-fetch. |
| A16-07 | P1 | Missing patient parameter is handled | Call a resource endpoint (e.g. Condition) without selecting a patient first. | Empty state: "Select a patient to explore their FHIR R4 resources" — resource tabs aren't shown at all until a patient is chosen. |

### A17. Settings

Tabs: **Profile**, **Practice**, **Referral Prefs**, **Notifications**, **AI & Tools**, **Security**.

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| A17-01 | P0 | All tabs load current values | `/app/settings`. Click through all 6 tabs. | Each renders the provider's actual saved values, not defaults. |
| A17-02 | P0 | Save Profile (incl. avatar) | Change name/phone, upload a new avatar image, "Save Profile." | Persists after reload; new avatar displays. |
| A17-03 | P1 | Save Practice settings | Toggle "Accepting New Patients," adjust "Max New Patients Per Week" slider, "Save Practice Settings." | Persists after reload. |
| A17-04 | P1 | Save Referral Preferences | Toggle "Auto-Accept from Verified," adjust "Max Referrals Per Week," "Save Referral Preferences." | Persists after reload. |
| A17-05 | P1 | Save Notification Preferences | Toggle a referral/message/AI-alert/token notification switch, "Save Notification Settings." | Persists after reload. |
| A17-06 | P1 | Save AI & Tools preferences | Toggle "Enable AI Matching," change "PA Analysis Mode," "Save AI Settings." | Persists after reload. |
| A17-07 | P0 | Change password (see A2-13/A2-14/A2-15) | — | — |
| A17-08 | P1 | Save Security toggles (excluding password) | Toggle a security setting, save. | Persists after reload. |

### A18. Cross-Cutting: Access Control & Negative Paths

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| A18-01 | P0 | Provider cannot access admin routes | While logged in as a provider, navigate directly to any `/admin/*` URL. | Redirected away — never shows admin content. |
| A18-02 | P0 | Provider cannot view an unrelated patient | Attempt to open a patient detail page/API for a patient with no relationship to this provider. | Access denied (403). |
| A18-03 | P1 | Direct URL to a nonexistent record | Navigate to a detail page for a nonexistent referral/patient/appointment ID. | Clear "not found" state — never a blank page or crash. |
| A18-04 | P1 | Network failure during a save preserves entered data | Simulate a network drop mid-submit on any form. | Error shown; the form retains what was typed for retry — no silent data loss. |
| A18-05 | P1 | Browser back/forward through multi-step forms | Use back/forward mid-wizard (referral/appointment/onboarding/PA creation). | No crash; step state either preserved sensibly or resets cleanly. |

---

## Part B — Admin Portal

### B1. Admin Authentication

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| B1-01 | P0 | Admin login | `/admin/login`. Enter `admin@clinictrustai.com` / `Demo1234!`. | Redirected into the admin panel; admin nav appears. |
| B1-02 | P0 | Admin login with wrong password | Valid admin email, wrong password. | "Invalid credentials" (HTTP 401). |
| B1-03 | P0 | Provider credentials rejected on admin login | Attempt `/admin/login` with a regular provider's (role `doctor`/`provider`/etc.) credentials. | Rejected: "Access denied. Admin privileges required." (HTTP 403) — the provider is authenticated but not authorized for admin. |
| B1-04 | P0 | Superadmin can access the admin panel 🛠 | Log in with a `superadmin`-role account. | **Full access granted** — previously a client-side bug redirected superadmins back to `/admin/login` even though the server allowed them; this is now fixed. |
| B1-05 | P0 | Admin logout | Log out from the admin panel. | Session cleared; any `/admin/*` route redirects to `/admin/login`. |
| B1-06 | P1 | Admin session persists across refresh | Refresh on any admin page. | Still logged in. |

### B2. Admin — KYC Review

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| B2-01 | P0 | KYC queue loads pending providers | Admin Panel → KYC. | Providers with `under_review` status (from A3-04) appear. |
| B2-02 | P0 | Approve a provider's KYC | Select an `under_review` provider, click Approve. | `kycStatus` → `verified`; on next login/refresh, provider passes the onboarding wall into the full app; a wallet/blockchain identity is created if the provider didn't already have one. |
| B2-03 | P0 | Reject a provider's KYC with a reason | Select a provider, Reject, enter a rejection reason. | Status → `rejected`; reason stored and shown to the provider on their onboarding wall; provider remains blocked. |
| B2-04 | P1 | View/download a submitted KYC document | "View Document" on a provider with an uploaded file. | Opens/downloads correctly — works whether local disk or cloud storage is the active backend. |
| B2-05 | P1 | Edit a provider's profile from admin | "Edit Profile" → change a field → save. | Persists on reload. |
| B2-06 | P1 | Resend verification email | "Resend Verification Email." | In-app confirmation that the resend was triggered. |
| B2-07 | P0 | Hard-delete a provider | Delete a provider profile, confirm. | Provider, profile, wallet, blockchain identity, schedule, match profile, and notifications are all removed; their email becomes available for fresh registration. |
| B2-08 | P1 | Refresh KYC list | Click refresh. | Re-fetches current data. |

### B3. Admin — Referrals Oversight 🛠

Read-only oversight with a configurable Workflow Settings tab.

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| B3-01 | P0 | Referral Management loads all referrals | `/admin/referrals`. | All referrals across the platform load with search, Status filter, and Has Dispute filter. |
| B3-02 | P0 | Search referrals | Search by patient or provider name. | Narrows correctly. |
| B3-03 | P0 | Filter by status | Select Pending/Accepted/Completed/Cancelled/Rejected. | Table narrows correctly. |
| B3-04 | P0 | Filter by "Has Dispute" 🛠 | Select "Yes," then "No." | "Yes" shows only referrals with an active/resolved dispute record; "No" shows the rest. Previously this filter did nothing at all. |
| B3-05 | P0 | Dispute column shows real status 🛠 | View a referral that has a `ReferralDispute` record. | Column shows a colored chip with the actual dispute status (Pending/Resolved/Rejected) — previously always showed "None" regardless of reality. |
| B3-06 | P0 | Tabs: All / Pending / Accepted / Completed / Cancelled+Rejected | Click through each tab. | Badge counts match the actual filtered counts. |
| B3-07 | P1 | View referral detail dialog | Click the view icon on any row. | Patient info, referring/receiving provider info, reason/notes, and billing all render correctly. |
| B3-08 | P0 | Edit and save Workflow Settings 🛠 | "Workflow Settings" tab → change SLA Acceptance Hours (1–168), Completion SLA Days (1–365), or toggle "AI Auto-Assignment" / "Require Prior Authorization" / "Allow Direct-to-Specialist" → "Save Settings." | Saves successfully ("Workflow settings saved!"); **reloading the page shows the saved values**, not the defaults — previously the save silently persisted nothing usable and nothing was ever reloaded. |
| B3-09 | P0 | View Stats dialog | "View Stats" button. | Statistics dialog loads: totals by status, active disputes, average completion time, top referrers/receivers, monthly trends. |
| B3-10 | P1 | Export statistics as PDF | In the Stats dialog, "Export Report." | PDF export completes without error. |

### B4. Admin — Messaging (Broadcast, Targeted Alerts, Escalations) 🛠

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| B4-01 | P0 | Create a broadcast message | Messaging → Broadcast Messages → "New Message," fill title/content/audience, save as draft. | Created with `draft` status. |
| B4-02 | P0 | Send a broadcast message | Select a draft, click Send. | Status → `sent` with a `sentAt` timestamp. |
| B4-03 | P1 | Edit/delete a draft broadcast message | Edit content of a draft; delete a draft. | Both persist correctly. |
| B4-04 | P0 | Create a targeted alert | Targeted Alerts → "New Alert" → select specific recipients, title/message/severity → save as draft. | Created with `draft` status and correct recipient list. |
| B4-05 | P0 | Send a targeted alert 🛠 | Select a draft alert, click Send. | Status → `sent` with `sentAt` — **this must succeed without a 404** (a wrong endpoint path previously broke this exact action; regression-test it every release). |
| B4-06 | P1 | Cannot re-send an already-sent alert | Click Send again on a `sent` alert. | Rejected: "Alert already sent" — no duplicate send. |
| B4-07 | P1 | Edit/delete a draft targeted alert | Edit a draft's content; delete a draft. | Both persist correctly. |
| B4-08 | P0 | Escalation workflows list and filter | Escalation Workflows → apply status filters/tabs. | Loads and filters correctly. |
| B4-09 | P0 | Assign an escalation | Select an unassigned escalation, choose a provider, confirm. | Escalation's assigned provider updates; status reflects "assigned." |
| B4-10 | P0 | Resolve an escalation | On an assigned escalation, enter resolution notes + resolver, confirm. | Status → `resolved`; details visible on reopening. |
| B4-11 | P1 | Provider message threads (read-only) | Provider Threads → expand a referral's thread. | Correct message history for that referral loads. |

### B5. Admin — AI Referral Matching

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| B5-01 | P0 | Match Analytics tab loads | `/admin/referral-matching` → "Match Analytics." | 4 stat cards (Total Match Sessions, Avg Top Score, Selection Rate %, Active Providers), "Top Requested Specialties" bars, and "Recent Match Sessions" table all render. |
| B5-02 | P1 | View a match session's detail | Click the view icon on a session row. | Dialog shows provider/specialty/insurance/score/date and the ranked AI suggestions table (Rank, Provider, Score, Reason). |
| B5-03 | P0 | Provider Profiles tab loads and filters | "Provider Profiles" tab → search by name, filter by specialty/state, toggle "Accepting Only." | Table narrows correctly on every filter. |
| B5-04 | P0 | Edit a provider match profile | Click "View / Edit" on a provider row → change Availability Score (0–100), "Accepting Referrals" (Yes/No), Accepted Insurance (comma-separated) → Save. | Persists to the database — confirmed by reloading the list and seeing the new values (not a display-only stub). |
| B5-05 | P0 | Non-admin cannot edit a provider profile | Attempt the update as a non-admin role directly against the API. | Rejected: "Forbidden: admin access required" (HTTP 403). |
| B5-06 | P1 | Refresh reloads current tab's data | Click the header refresh icon on each tab. | Reloads stats+sessions (Match Analytics tab) or providers (Provider Profiles tab), matching the active tab only. |

### B6. Admin — Ambient AI Sessions

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| B6-01 | P0 | Sessions list loads with stats | Admin Panel → Ambient AI Sessions. | 4 stat cards (Total, Approved, Pending Review, Submitted); table loads all providers' sessions. |
| B6-02 | P0 | Search sessions | Search by patient name or chief complaint. | Narrows correctly. |
| B6-03 | P0 | Filter by status and urgency | Select a status (draft/reviewing/approved/rejected/submitted) and urgency (routine/urgent/emergent). | Table narrows correctly on both filters independently and combined. |
| B6-04 | P1 | View a session (read-only) | Click the view icon on a row. | Modal shows full session detail — this view is read-only by design; there are no edit/delete controls in the admin UI for ambient sessions. |

### B7. Admin — Appointments & Provider Utilization 🛠

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| B7-01 | P0 | All Appointments tab loads | Admin Panel → Appointments → "All Appointments." | Platform-wide list loads with stat cards (Total, Completed, No-Show Rate, Upcoming) and search/status/type/provider filters. |
| B7-02 | P0 | Mark an appointment completed from admin 🛠 | Open an appointment's detail dialog → "Mark Completed." | Succeeds (status → `completed`) — previously called a nonexistent endpoint and failed with a 404. |
| B7-03 | P0 | Mark an appointment no-show from admin 🛠 | Detail dialog → "Mark No-Show." | Succeeds (status → `no_show`). |
| B7-04 | P0 | Cancel an appointment from admin 🛠 | Detail dialog → "Cancel." | Succeeds via the dedicated cancel endpoint (status → `cancelled`, `cancellationReason` recorded) — previously failed. |
| B7-05 | P1 | Analytics tab loads | "Analytics" tab. | Appointments-by-type chart, No-Show Risk (color-coded by threshold), Recent Booking Trend, Top Providers table all render. |
| B7-06 | P0 | Provider Utilization date range selector | "Provider Utilization" tab → switch between 7 days / 30 days / 90 days / YTD. | Summary cards and the provider breakdown table (Total Slots, Booked, Fill Rate, Completed, No-Show, Cancel Rate, Avg Duration, Tokens Earned) genuinely re-fetch and change per range — not a static display. |
| B7-07 | P1 | Peak Appointment Hours table | View the Peak Hours table on the Provider Utilization tab. | Renders hourly booking load with a proportional visual bar per slot. |

### B8. Admin — DTx Management

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| B8-01 | P0 | Program Catalog loads | Admin Panel → DTx Marketplace → "Program Catalog." | All programs (active + inactive) load; "Show Inactive" toggle controls whether inactive ones are visible. |
| B8-02 | P0 | Add a new program | "Add Program" → fill Name, Vendor, Description (required) + Category, Evidence Level, Delivery Format, Duration, Token Reward, Integration URL, Conditions, Content Types, Highlights, Contraindications → Save. | Program appears in the catalog and becomes prescribable on the provider-facing marketplace (A14-01). |
| B8-03 | P1 | Add Program — validation | Submit with Name, Vendor, or Description empty. | Blocked with a clear required-field error. |
| B8-04 | P0 | Deactivate a program | Click "Deactivate" on an active program. | `isActive` → false (soft delete); disappears from the provider marketplace; **historical prescriptions referencing it remain fully queryable** in All Prescriptions. |
| B8-05 | P1 | Reactivate a deactivated program | Click "Reactivate." | `isActive` → true; reappears in the marketplace. |
| B8-06 | P0 | All Prescriptions tab loads cross-provider | "All Prescriptions" tab → filter by status. | Prescriptions from all providers load and filter correctly. |
| B8-07 | P1 | Analytics tab renders aggregate stats | "Analytics" tab. | Prescriptions-by-category chart, Top Programs list, Status Breakdown (with completion rate and tokens awarded) all render consistent with the underlying data. |

### B9. Admin — Token Management

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| B9-01 | P0 | Provider Balances tab loads | Admin Panel → Token Management. | Table of providers with balance, last transaction; search + filter (organization/specialty/status/activity). |
| B9-02 | P1 | Drill into a provider's transaction history | Click "History" on a provider row. | Correct transaction list (type, amount color-coded, reason, timestamp, status). |
| B9-03 | P0 | Mint tokens — single-admin mode (`TOKEN_MULTISIG_REQUIRED` ≤1) | Mint dialog → amount + reason → "Mint Tokens." | Executes immediately; provider balance increases right away. |
| B9-04 | P0 | Mint tokens — multi-sig mode (`TOKEN_MULTISIG_REQUIRED` >1) | Same, with multisig threshold set above 1. | Returns HTTP 202, "Mint operation queued. Requires {N} more approval(s) to execute." — balance does **not** change until enough admins approve. |
| B9-05 | P0 | Burn tokens follows the same multi-sig rule as mint | Repeat B9-03/B9-04 for Burn. | Identical behavior — immediate in single-admin mode, queued pending approval otherwise. |
| B9-06 | P0 | Bonus distribution bypasses multi-sig | Bonus Distribution tab → select provider, amount, optional reason → "Credit Tokens." | Executes immediately regardless of `TOKEN_MULTISIG_REQUIRED` — this is a direct-credit path by design, not a mint/burn operation. |
| B9-07 | P1 | Redemption Catalog CRUD | Catalog tab → add/edit/delete a catalog item (name, description, category, token cost). | Persists; new/edited items appear on the provider-facing Redeem Tokens screen (A8-06). |
| B9-08 | P1 | Conversion Rules CRUD | Conversion Rules tab → add/edit/delete a rule. | Persists correctly. |
| B9-09 | P0 | Earn Policy editor | Earn Policy tab → change a value (e.g. `referralSent`, `dtxCompleted`) → "Save Policy." | Persists; subsequently-completed actions of that type reward the new amount (cross-check with A6-09's referral completion reward or A14-09's DTx completion reward). |
| B9-10 | P1 | Redemption & Limits editor | Change `tokenToUSD`, `minRedemption`, `tokenExpiryDays`, `maxTokensPerUser`, or `bonusEventsPerMonth` → "Save Limits." | Persists correctly. |
| B9-11 | P1 | Token economy analytics | Analytics tab. | Total Circulating, Earned/Spent (30d), Net Velocity, Top 10 Earners, Most Redeemed Services all render. |

### B10. Admin — AI Configuration & Analytics 🛠

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| B10-01 | P0 | AI Configuration loads default values | Admin Panel → AI Configuration. | Categories render: Prior Auth (Auto-Approve Threshold default 0.95, Minimum Confidence 0.80, Manual Review Threshold 0.65), Risk Score, Referral Matching, Escalation, Ambient. |
| B10-02 | P0 | Editing the Prior Auth auto-approve threshold actually changes behavior 🛠 | Set "Auto-Approve Threshold" to a new value (e.g. 0.99), save. Submit a new Prior Auth request whose AI confidence score would have cleared the *old* threshold but not the *new* one. | The PA is **not** auto-approved under the new, stricter threshold — previously this setting was persisted but silently ignored (auto-approval always used a hardcoded 0.92 regardless of what was configured here). |
| B10-03 | P1 | Reset AI Configuration to defaults | "Reset" action (if present) or `POST /admin/ai-config/reset`. | All configs revert to their documented default values. |
| B10-04 | P1 | Admin platform-wide analytics dashboard | Admin Panel → Analytics. | Aggregate platform metrics render without error. |

### B11. Admin — User Management

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| B11-01 | P0 | Users list loads with search/filter | Admin Panel → Users. | Table (Name, Email, Role chip, Status chip, Created) loads; Search Users box and Filter dialog (Role/Status) both narrow correctly. |
| B11-02 | P0 | Add a new user | "Add New User" → name, email, role, active toggle → Save. | User created; if a temporary password is generated, it's shown once in a copyable dialog. |
| B11-03 | P1 | Edit an existing user | Edit icon → change role or active toggle → Save. | Persists after reload. |
| B11-04 | P0 | Deactivate a user blocks login 🛠 | Edit a user, toggle Active off, save. Attempt to log in as that user. | Login is rejected: "Your account is inactive. Please contact your administrator." (HTTP 403) — confirmed as a real, enforced block, not just a cosmetic status chip. |
| B11-05 | P1 | Reactivate a user restores login | Toggle Active back on for a deactivated user. | That user can log in again. |
| B11-06 | P1 | Reset a user's password | Reset Password icon → confirm. | A temporary password is generated and shown once in a copyable dialog. |
| B11-07 | P1 | Unlock a locked account | On a user with `lockedUntil` in the future (from A2-04), click Unlock Account → confirm. | Account is immediately unlockable; the user can log in before the lockout window would have naturally expired. |
| B11-08 | P1 | Cannot delete an admin/superadmin user | Attempt to delete a user with role `admin` or `superadmin`. | Delete icon is disabled for these roles — prevents accidental admin lockout. |

### B12. Admin — Prior Authorization Oversight

CARC denial codes: `4` (not covered), `50` (not medically necessary), `96` (non-covered charge), `167` (diagnosis not covered), `197` (precert absent), `252` (documentation required). Approval durations: 30/60/90/180/365 days.

| ID | Priority | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| B12-01 | P0 | PA queue loads with priority sorting | Admin Panel → Prior Authorizations. | List loads sorted by computed priority (urgency + wait time + borderline-confidence + overdue-appeal boosts); 6 stat cards (Pending/Under Review/Approved/Denied/Appealing/Expired) render. |
| B12-02 | P0 | Overdue-appeal banner | With at least one `Appealing` PA past its `appealDeadlineDate`. | Red alert banner: "{N} appeal(s) past SLA deadline — please review immediately." |
| B12-03 | P0 | Approve a PA | Select a `Pending`/`Under Review` PA → Review → Decision "Approved" → choose an approval duration (30/60/90/180/365 days) → Submit. | Status → `Approved`; `approvedDate` and `expiryDate` (approvedDate + chosen duration) set; visible on the provider's PA detail. |
| B12-04 | P0 | Deny a PA with a CARC reason | Select a PA → Review → Decision "Denied" → choose a CARC code → notes → Submit. | Status → `Denied`; CARC code + notes stored and visible to the provider, enabling their appeal flow (A13-08). |
| B12-05 | P1 | Bulk approve/deny | Select multiple PAs via checkboxes → "Bulk Approve" or "Bulk Deny" with shared decision fields → confirm. | All selected PAs update atomically; response reports the processed count. |
| B12-06 | P1 | Approve/deny an appeal | On an `Appealing` PA → Appeal Review → Decision → notes → Submit. | Status → `Appeal Approved` or `Appeal Denied` accordingly. |
| B12-07 | P1 | Re-run AI analysis on a PA | "AI Analysis" action on a PA. | Re-triggers analysis; updated recommendation/confidence appears. |
| B12-08 | P1 | View PA audit history as admin | "View History" on a PA. | Full chronological action timeline renders (same action types as A13-07). |
| B12-09 | P1 | PA analytics | Analytics view/dialog. | Turnaround-time-by-service, denial-reason breakdown, and approval-rate-by-urgency all render. |

---

## Suggested Execution Order for a "Zero-Defect" Release Gate

1. **P0 smoke pass** — every P0 scenario across both parts, on a freshly seeded environment (`npm run populate_db`). Any P0 failure blocks release.
2. **🛠 regression pass** — every 🛠-flagged scenario, since each maps 1:1 to a defect found and fixed during this verification. This is the highest-risk area for silent regression in future changes.
3. **P1 full pass.**
4. **P2 pass** as time allows — track any deferred item as a known-issue backlog entry, never silently skip it.
5. **Cross-role sanity pass** — run 2–3 flows as two simultaneous users (e.g. Provider A refers to Provider B; B accepts; confirm both sides see consistent state) to catch state-sync issues single-user scripts miss.
6. **Admin superadmin pass** — re-run the B-series scenarios logged in as a `superadmin` account specifically, not just `admin` (B1-04 was a real, fixed defect; a regression here would silently lock out every superadmin again).
