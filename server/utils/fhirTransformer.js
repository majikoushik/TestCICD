/**
 * FHIR R4 Resource Transformers
 * Converts ClinicTrustAI internal data models → HL7 FHIR R4 (4.0.1) compliant resources
 * Complies with: ONC 21st Century Cures Act / CMS-0057-F / US Core R4 profiles
 */


const FHIR_VERSION = '4.0.1';

const toFHIRDate = (d) => {
  if (!d) return null;
  try { return new Date(d).toISOString().split('T')[0]; } catch { return null; }
};

const toFHIRDateTime = (d) => {
  if (!d) return null;
  try { return new Date(d).toISOString(); } catch { return null; }
};

const genderMap = {
  male: 'male', Male: 'male', M: 'male', m: 'male',
  female: 'female', Female: 'female', F: 'female', f: 'female',
  other: 'other', unknown: 'unknown',
};

// ── Patient ──────────────────────────────────────────────────────────────────

function toFHIRPatient(patient, providerRefId) {
  const id = patient.patientId || String(patient._id || patient.id || '');
  const firstName = patient.firstName || (patient.name || '').split(' ')[0] || '';
  const lastName  = patient.lastName  || (patient.name || '').split(' ').slice(1).join(' ') || '';

  return {
    resourceType: 'Patient',
    id,
    meta: {
      versionId: '1',
      lastUpdated: toFHIRDateTime(patient.updatedAt),
      profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'],
    },
    identifier: [{
      use: 'official',
      type: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR', display: 'Medical Record Number' }],
        text: 'Medical Record Number',
      },
      system: 'urn:clinictrustai:patient',
      value: id,
    }],
    active: true,
    name: [{ use: 'official', family: lastName, given: firstName ? [firstName] : [] }],
    telecom: [
      patient.contactInfo?.phone && { system: 'phone', value: patient.contactInfo.phone, use: 'home' },
      (patient.email || patient.contactInfo?.email) && { system: 'email', value: patient.email || patient.contactInfo?.email },
    ].filter(Boolean),
    gender: genderMap[patient.gender] || 'unknown',
    birthDate: toFHIRDate(patient.dateOfBirth || patient.birthDate),
    address: patient.contactInfo?.address
      ? [{ use: 'home', text: patient.contactInfo.address }]
      : [],
    generalPractitioner: providerRefId
      ? [{ reference: `Practitioner/${providerRefId}` }]
      : [],
  };
}

// ── Practitioner ─────────────────────────────────────────────────────────────

function toFHIRPractitioner(user) {
  const id = String(user._id || user.id || '');
  const rawName  = (user.name || '').replace(/^Dr\.?\s*/i, '');
  const firstName = user.firstName || rawName.split(' ')[0] || '';
  const lastName  = user.lastName  || rawName.split(' ').slice(1).join(' ') || '';
  const isDoctor  = ['doctor', 'physician'].includes((user.role || '').toLowerCase());

  return {
    resourceType: 'Practitioner',
    id,
    meta: {
      versionId: '1',
      lastUpdated: toFHIRDateTime(user.updatedAt),
      profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-practitioner'],
    },
    identifier: [{ system: 'urn:clinictrustai:provider', value: id }],
    active: user.isActive !== false,
    name: [{
      use: 'official',
      family: lastName,
      given: firstName ? [firstName] : [],
      prefix: isDoctor ? ['Dr.'] : [],
    }],
    telecom: user.email ? [{ system: 'email', value: user.email }] : [],
    qualification: user.specialty ? [{
      code: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v2-0360',
          code: isDoctor ? 'MD' : 'RN',
          display: user.specialty,
        }],
        text: user.specialty,
      },
    }] : [],
  };
}

// ── Condition ─────────────────────────────────────────────────────────────────

function toFHIRCondition(condition, patientId, index) {
  return {
    resourceType: 'Condition',
    id: `cond-${patientId}-${index}`,
    meta: {
      profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition'],
    },
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' }],
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed', display: 'Confirmed' }],
    },
    code: {
      coding: [{ system: 'http://snomed.info/sct', display: condition.condition || condition.name || 'Unknown' }],
      text: condition.condition || condition.name || 'Unknown',
    },
    subject: { reference: `Patient/${patientId}` },
    onsetDateTime: toFHIRDateTime(condition.diagnosedDate) || undefined,
    note: condition.notes ? [{ text: condition.notes }] : [],
  };
}

// ── MedicationRequest ─────────────────────────────────────────────────────────

function toFHIRMedicationRequest(medication, patientId, index) {
  return {
    resourceType: 'MedicationRequest',
    id: `medrx-${patientId}-${index}`,
    meta: {
      profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest'],
    },
    status: 'active',
    intent: 'order',
    medicationCodeableConcept: {
      coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', display: medication.name }],
      text: `${medication.name}${medication.dosage ? ` ${medication.dosage}` : ''}`,
    },
    subject: { reference: `Patient/${patientId}` },
    authoredOn: toFHIRDateTime(medication.startDate) || undefined,
    dosageInstruction: [{
      text: [medication.dosage, medication.frequency].filter(Boolean).join(' — ') || 'As directed',
    }],
  };
}

// ── AllergyIntolerance ────────────────────────────────────────────────────────

function toFHIRAllergyIntolerance(allergy, patientId, index) {
  const severityMap = { mild: 'mild', Mild: 'mild', moderate: 'moderate', Moderate: 'moderate', severe: 'severe', Severe: 'severe' };
  return {
    resourceType: 'AllergyIntolerance',
    id: `allergy-${patientId}-${index}`,
    meta: {
      profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance'],
    },
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }],
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: 'confirmed' }],
    },
    patient: { reference: `Patient/${patientId}` },
    code: { coding: [{ display: allergy.allergen }], text: allergy.allergen },
    criticality: ['Severe', 'severe'].includes(allergy.severity) ? 'high' : 'unable-to-assess',
    reaction: allergy.reaction ? [{
      manifestation: [{ coding: [{ display: allergy.reaction }], text: allergy.reaction }],
      severity: severityMap[allergy.severity] || undefined,
    }] : [],
  };
}

// ── Coverage ──────────────────────────────────────────────────────────────────

function toFHIRCoverage(insurance, patientId) {
  return {
    resourceType: 'Coverage',
    id: `coverage-${patientId}`,
    status: 'active',
    beneficiary: { reference: `Patient/${patientId}` },
    payor: [{ display: insurance.provider || 'Unknown Insurer' }],
    subscriberId: insurance.policyNumber || undefined,
    class: insurance.groupNumber ? [{
      type: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/coverage-class', code: 'group', display: 'Group' }],
      },
      value: insurance.groupNumber,
      name: 'Group Plan',
    }] : [],
  };
}

// ── ServiceRequest (Referral) ─────────────────────────────────────────────────

function toFHIRServiceRequest(referral) {
  const statusMap  = { pending: 'active', accepted: 'active', completed: 'completed', rejected: 'revoked', cancelled: 'revoked' };
  const priorityMap = { urgent: 'urgent', routine: 'routine', emergency: 'stat', stat: 'stat' };
  return {
    resourceType: 'ServiceRequest',
    id: String(referral._id || referral.id || ''),
    meta: {
      lastUpdated: toFHIRDateTime(referral.updatedAt) || undefined,
    },
    status: statusMap[referral.status] || 'unknown',
    intent: 'order',
    priority: priorityMap[referral.urgency] || 'routine',
    subject: { reference: `Patient/${referral.patient || referral.patientId}` },
    requester: { reference: `Practitioner/${referral.referringProvider}` },
    performer: referral.receivingProvider ? [{ reference: `Practitioner/${referral.receivingProvider}` }] : [],
    code: { text: referral.specialty || 'General Referral' },
    reasonCode: referral.reason ? [{ text: referral.reason }] : [],
    note: referral.notes ? [{ text: referral.notes }] : [],
    authoredOn: toFHIRDateTime(referral.createdAt) || undefined,
  };
}

// ── Bundle ────────────────────────────────────────────────────────────────────

function toFHIRBundle(resourceType, resources, baseUrl) {
  return {
    resourceType: 'Bundle',
    id: `bundle-${resourceType.toLowerCase()}-${Date.now()}`,
    type: 'searchset',
    total: resources.length,
    timestamp: new Date().toISOString(),
    link: [{ relation: 'self', url: `${baseUrl}/${resourceType}` }],
    entry: resources.map((r) => ({
      fullUrl: `${baseUrl}/${r.resourceType}/${r.id}`,
      resource: r,
      search: { mode: 'match' },
    })),
  };
}

// ── CapabilityStatement ───────────────────────────────────────────────────────

function capabilityStatement(baseUrl) {
  return {
    resourceType: 'CapabilityStatement',
    id: 'clinictrustai-fhir-capability',
    url: `${baseUrl}/metadata`,
    version: '1.0.0',
    name: 'ClinicTrustAI_FHIR_CapabilityStatement',
    title: 'ClinicTrustAI FHIR R4 Capability Statement',
    status: 'active',
    experimental: false,
    date: '2025-01-01',
    publisher: 'ClinicTrust Health Network',
    description: 'FHIR R4 server for ClinicTrustAI — ONC 21st Century Cures Act / CMS-0057-F compliant. Supports US Core R4 profiles.',
    kind: 'instance',
    software: { name: 'ClinicTrustAI FHIR Server', version: '1.0.0' },
    implementation: { description: 'ClinicTrustAI FHIR R4 REST API', url: baseUrl },
    fhirVersion: FHIR_VERSION,
    format: ['application/fhir+json', 'application/json'],
    rest: [{
      mode: 'server',
      documentation: 'RESTful FHIR R4 supporting Patient, Practitioner, Condition, MedicationRequest, AllergyIntolerance, Coverage, ServiceRequest.',
      security: {
        cors: true,
        service: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/restful-security-service', code: 'SMART-on-FHIR' }] }],
        description: 'JWT Bearer token authentication (SMART on FHIR compatible)',
      },
      resource: [
        {
          type: 'Patient',
          profile: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient',
          interaction: [{ code: 'read' }, { code: 'search-type' }],
          searchParam: [
            { name: '_id', type: 'token' },
            { name: 'identifier', type: 'token', documentation: 'Patient ID (patientId)' },
            { name: 'name', type: 'string' },
          ],
        },
        {
          type: 'Practitioner',
          profile: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-practitioner',
          interaction: [{ code: 'read' }],
          searchParam: [{ name: '_id', type: 'token' }],
        },
        {
          type: 'Condition',
          profile: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition',
          interaction: [{ code: 'search-type' }],
          searchParam: [{ name: 'patient', type: 'reference', documentation: 'Patient reference (required)' }],
        },
        {
          type: 'MedicationRequest',
          profile: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest',
          interaction: [{ code: 'search-type' }],
          searchParam: [{ name: 'patient', type: 'reference', documentation: 'Patient reference (required)' }],
        },
        {
          type: 'AllergyIntolerance',
          profile: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance',
          interaction: [{ code: 'search-type' }],
          searchParam: [{ name: 'patient', type: 'reference', documentation: 'Patient reference (required)' }],
        },
        {
          type: 'Coverage',
          interaction: [{ code: 'search-type' }],
          searchParam: [{ name: 'patient', type: 'reference', documentation: 'Patient reference (required)' }],
        },
        {
          type: 'ServiceRequest',
          interaction: [{ code: 'search-type' }],
          searchParam: [{ name: 'patient', type: 'reference', documentation: 'Patient reference (required)' }],
        },
      ],
    }],
  };
}

module.exports = {
  toFHIRPatient,
  toFHIRPractitioner,
  toFHIRCondition,
  toFHIRMedicationRequest,
  toFHIRAllergyIntolerance,
  toFHIRCoverage,
  toFHIRServiceRequest,
  toFHIRBundle,
  capabilityStatement,
};
