/**
 * ONC Information Blocking Exceptions Registry
 * 21st Century Cures Act — 45 CFR Part 171
 *
 * Every access restriction in ClinicTrustAI must qualify under one of these
 * eight ONC exceptions or it constitutes information blocking.  This registry
 * is used to populate X-ONC-Exception response headers on 403 responses so
 * that clients (and ONC auditors) can see precisely which exception applies.
 *
 * Primary source: https://healthit.gov/information-blocking/
 */

const ONC_EXCEPTIONS = {
  PREVENTING_HARM: {
    code: 'preventing-harm',
    name: 'Preventing Harm Exception',
    regulation: '45 CFR § 171.201',
    description: 'Restricting access necessary to prevent patient harm.',
  },
  PRIVACY: {
    code: 'privacy',
    name: 'Privacy Exception',
    regulation: '45 CFR § 171.202',
    description:
      'Protecting against use or disclosure that would violate the HIPAA Privacy Rule or applicable state privacy laws.',
  },
  SECURITY: {
    code: 'security',
    name: 'Security Exception',
    regulation: '45 CFR § 171.203',
    description:
      'Practices required to protect the security of EHI (authentication, encryption, rate-limiting, session management).',
  },
  INFEASIBILITY: {
    code: 'infeasibility',
    name: 'Infeasibility Exception',
    regulation: '45 CFR § 171.204',
    description: 'Request is technically or operationally infeasible to fulfil.',
  },
  HEALTH_IT_PERFORMANCE: {
    code: 'health-it-performance',
    name: 'Health IT Performance Exception',
    regulation: '45 CFR § 171.205',
    description: 'Temporary restriction during maintenance, updates, or system failures.',
  },
  CONTENT_AND_MANNER: {
    code: 'content-and-manner',
    name: 'Content and Manner Exception',
    regulation: '45 CFR § 171.301',
    description:
      'Defining the format and method of data exchange; an alternative must be offered.',
  },
  FEES: {
    code: 'fees',
    name: 'Fees Exception',
    regulation: '45 CFR § 171.302',
    description: 'Reasonable cost-based fees for data access; must not exceed cost of production.',
  },
  LICENSING: {
    code: 'licensing',
    name: 'Licensing Exception',
    regulation: '45 CFR § 171.303',
    description: 'IP licensing conditions related to interfaces, content, or technology.',
  },
};

/**
 * Maps each access-restricted route pattern to the ONC exception that justifies
 * the restriction.  Consumed by route handlers to set X-ONC-Exception headers.
 */
const ROUTE_EXCEPTION_MAP = {
  'GET /api/patients/:id': {
    exception: ONC_EXCEPTIONS.PRIVACY,
    rationale:
      'Access limited to treating providers with documented patient consent, per HIPAA minimum necessary standard.',
  },
  'PUT /api/patients/:id': {
    exception: ONC_EXCEPTIONS.PRIVACY,
    rationale:
      'Editing EHI requires primary provider status or explicit edit consent documented in the patient record.',
  },
  'GET /api/patients/:id/medical-records': {
    exception: ONC_EXCEPTIONS.PRIVACY,
    rationale: 'Medical records access requires documented patient consent.',
  },
  'GET /api/patients/:id/consent-records': {
    exception: ONC_EXCEPTIONS.PRIVACY,
    rationale:
      'Consent record management is restricted to the primary provider acting as the HIPAA custodian for this patient.',
  },
  'POST /api/patients/:id/consent': {
    exception: ONC_EXCEPTIONS.PRIVACY,
    rationale: 'Granting consent rights is restricted to the primary provider.',
  },
  'GET /api/analytics/insights/patient/:patientId': {
    exception: ONC_EXCEPTIONS.PRIVACY,
    rationale:
      'AI-derived patient insights require documented consent and are limited to treating providers.',
  },
  'GET /api/referrals/:id': {
    exception: ONC_EXCEPTIONS.PRIVACY,
    rationale:
      'Referral records are limited to the referring and receiving providers directly involved in patient care.',
  },
  'GET /api/patients/:id/export': {
    exception: ONC_EXCEPTIONS.PRIVACY,
    rationale:
      'Full EHI export is restricted to the primary treating provider and administrators to prevent mass data exposure.',
  },
};

/**
 * Attaches ONC exception headers to a response object and returns it,
 * enabling fluent chaining: oncDeny(res, key).status(403).json(...)
 */
function oncDeny(res, routeKey) {
  const entry = ROUTE_EXCEPTION_MAP[routeKey] || {
    exception: ONC_EXCEPTIONS.PRIVACY,
    rationale: 'Access restricted per patient privacy requirements (HIPAA minimum necessary).',
  };
  res.setHeader('X-ONC-Exception',           entry.exception.code);
  res.setHeader('X-ONC-Exception-Name',      entry.exception.name);
  res.setHeader('X-ONC-Exception-Regulation', entry.exception.regulation);
  res.setHeader('X-ONC-Exception-Rationale', entry.rationale);
  return res;
}

module.exports = { ONC_EXCEPTIONS, ROUTE_EXCEPTION_MAP, oncDeny };
