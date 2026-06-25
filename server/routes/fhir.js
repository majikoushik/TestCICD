/**
 * FHIR R4 REST API routes — live database mode
 * Mounted at /api/fhir by server/index.js
 */
const express = require('express');
const router  = express.Router();

const Patient  = require('../models/Patient');
const User     = require('../models/User');
const Referral = require('../models/Referral');
const { protect } = require('../middleware/auth');
const {
  toFHIRPatient,
  toFHIRPractitioner,
  toFHIRCondition,
  toFHIRMedicationRequest,
  toFHIRAllergyIntolerance,
  toFHIRCoverage,
  toFHIRServiceRequest,
  toFHIRBundle,
  capabilityStatement,
} = require('../utils/fhirTransformer');

const FHIR_CT = 'application/fhir+json';

const getBaseUrl = (req) =>
  `${req.protocol}://${req.get('host')}/api/fhir`;

const opOutcome = (status, code, diagnostics, res) =>
  res.status(status).type(FHIR_CT).json({
    resourceType: 'OperationOutcome',
    issue: [{ severity: status < 500 ? 'error' : 'fatal', code, diagnostics }],
  });

// ── GET /fhir/metadata — public CapabilityStatement ──────────────────────────
router.get('/metadata', (req, res) => {
  res.type(FHIR_CT).json(capabilityStatement(getBaseUrl(req)));
});

// All routes below require a valid JWT
router.use(protect);

// ── GET /fhir/Patient ─────────────────────────────────────────────────────────
router.get('/Patient', async (req, res) => {
  try {
    const query = {};
    if (req.query.name) {
      query.$or = [
        { firstName: { $regex: req.query.name, $options: 'i' } },
        { lastName:  { $regex: req.query.name, $options: 'i' } },
        { name:      { $regex: req.query.name, $options: 'i' } },
      ];
    }
    if (req.query.identifier) query.patientId = req.query.identifier;

    const patients = await Patient.find(query).limit(100).lean();
    const resources = await Promise.all(patients.map(async (p) => {
      const provider = p.primaryProvider
        ? await User.findById(p.primaryProvider).lean()
        : null;
      return toFHIRPatient(p, provider ? String(provider._id) : null);
    }));
    res.type(FHIR_CT).json(toFHIRBundle('Patient', resources, getBaseUrl(req)));
  } catch (err) {
    opOutcome(500, 'exception', err.message, res);
  }
});

// ── GET /fhir/Patient/:id ─────────────────────────────────────────────────────
router.get('/Patient/:id', async (req, res) => {
  try {
    const patient = await Patient.findOne({
      $or: [{ patientId: req.params.id }, { _id: req.params.id.match(/^[0-9a-f]{24}$/i) ? req.params.id : null }],
    }).lean();
    if (!patient) return opOutcome(404, 'not-found', 'Patient not found', res);
    const provider = patient.primaryProvider
      ? await User.findById(patient.primaryProvider).lean()
      : null;
    res.type(FHIR_CT).json(toFHIRPatient(patient, provider ? String(provider._id) : null));
  } catch (err) {
    opOutcome(500, 'exception', err.message, res);
  }
});

// ── GET /fhir/Practitioner/:id ────────────────────────────────────────────────
router.get('/Practitioner/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return opOutcome(404, 'not-found', 'Practitioner not found', res);
    res.type(FHIR_CT).json(toFHIRPractitioner(user));
  } catch (err) {
    opOutcome(500, 'exception', err.message, res);
  }
});

// Helper: resolve patientId OR MongoDB _id
const resolvePatient = async (idParam) => {
  const isOid = /^[0-9a-f]{24}$/i.test(idParam);
  return Patient.findOne(isOid
    ? { $or: [{ patientId: idParam }, { _id: idParam }] }
    : { patientId: idParam }
  ).lean();
};

// ── GET /fhir/Condition?patient=:id ──────────────────────────────────────────
router.get('/Condition', async (req, res) => {
  try {
    if (!req.query.patient) return opOutcome(400, 'required', 'patient parameter is required', res);
    const patient = await resolvePatient(req.query.patient);
    if (!patient) return opOutcome(404, 'not-found', 'Patient not found', res);
    const patientId = patient.patientId || String(patient._id);
    const resources = (patient.medicalHistory || []).map((c, i) =>
      toFHIRCondition(c, patientId, i));
    res.type(FHIR_CT).json(toFHIRBundle('Condition', resources, getBaseUrl(req)));
  } catch (err) {
    opOutcome(500, 'exception', err.message, res);
  }
});

// ── GET /fhir/MedicationRequest?patient=:id ───────────────────────────────────
router.get('/MedicationRequest', async (req, res) => {
  try {
    if (!req.query.patient) return opOutcome(400, 'required', 'patient parameter is required', res);
    const patient = await resolvePatient(req.query.patient);
    if (!patient) return opOutcome(404, 'not-found', 'Patient not found', res);
    const patientId = patient.patientId || String(patient._id);
    const resources = (patient.medications || []).map((m, i) =>
      toFHIRMedicationRequest(m, patientId, i));
    res.type(FHIR_CT).json(toFHIRBundle('MedicationRequest', resources, getBaseUrl(req)));
  } catch (err) {
    opOutcome(500, 'exception', err.message, res);
  }
});

// ── GET /fhir/AllergyIntolerance?patient=:id ──────────────────────────────────
router.get('/AllergyIntolerance', async (req, res) => {
  try {
    if (!req.query.patient) return opOutcome(400, 'required', 'patient parameter is required', res);
    const patient = await resolvePatient(req.query.patient);
    if (!patient) return opOutcome(404, 'not-found', 'Patient not found', res);
    const patientId = patient.patientId || String(patient._id);
    const resources = (patient.allergies || []).map((a, i) =>
      toFHIRAllergyIntolerance(a, patientId, i));
    res.type(FHIR_CT).json(toFHIRBundle('AllergyIntolerance', resources, getBaseUrl(req)));
  } catch (err) {
    opOutcome(500, 'exception', err.message, res);
  }
});

// ── GET /fhir/Coverage?patient=:id ───────────────────────────────────────────
router.get('/Coverage', async (req, res) => {
  try {
    if (!req.query.patient) return opOutcome(400, 'required', 'patient parameter is required', res);
    const patient = await resolvePatient(req.query.patient);
    if (!patient) return opOutcome(404, 'not-found', 'Patient not found', res);
    const patientId = patient.patientId || String(patient._id);
    const resources = patient.insuranceInfo
      ? [toFHIRCoverage(patient.insuranceInfo, patientId)]
      : [];
    res.type(FHIR_CT).json(toFHIRBundle('Coverage', resources, getBaseUrl(req)));
  } catch (err) {
    opOutcome(500, 'exception', err.message, res);
  }
});

// ── GET /fhir/ServiceRequest?patient=:id ─────────────────────────────────────
router.get('/ServiceRequest', async (req, res) => {
  try {
    if (!req.query.patient) return opOutcome(400, 'required', 'patient parameter is required', res);
    const patient = await resolvePatient(req.query.patient);
    if (!patient) return opOutcome(404, 'not-found', 'Patient not found', res);
    const referrals = await Referral.find({ patient: patient._id }).lean();
    const resources  = referrals.map(toFHIRServiceRequest);
    res.type(FHIR_CT).json(toFHIRBundle('ServiceRequest', resources, getBaseUrl(req)));
  } catch (err) {
    opOutcome(500, 'exception', err.message, res);
  }
});

module.exports = router;
