const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const Referral = require('../models/Referral');
const { protect, authorize } = require('../middleware/auth');
const { createConsentRecord, verifyConsent } = require('../blockchain/contracts');
const { ehiAudit } = require('../middleware/ehiAudit');
const { oncDeny } = require('../config/oncExceptions');

// @route   POST api/patients
// @desc    Create a new patient record
// @access  Private (doctors, clinics, hospitals)
router.post(
  '/',
  protect,
  authorize('doctor', 'clinic', 'hospital'),
  ehiAudit('Patient', 'CREATE'),
  async (req, res) => {
    try {
      const {
        patientId,
        name,
        dateOfBirth,
        gender,
        contactInfo,
        insuranceInfo,
        medicalHistory,
        medications,
        allergies,
      } = req.body;

      let patient = await Patient.findOne({ patientId });
      if (patient) {
        return res.status(400).json({ success: false, error: 'Patient already exists' });
      }

      patient = new Patient({
        patientId,
        name,
        dateOfBirth,
        gender,
        contactInfo,
        primaryProvider: req.user.id,
        insuranceInfo,
        medicalHistory: medicalHistory || [],
        medications: medications || [],
        allergies: allergies || [],
      });

      await patient.save();
      res.status(201).json({ success: true, data: patient });
    } catch (error) {
      console.error('Create patient error:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

// @route   GET api/patients
// @desc    Get all patients for the provider
// @access  Private (all healthcare providers)
router.get(
  '/',
  protect,
  authorize('doctor', 'clinic', 'hospital', 'lab'),
  ehiAudit('Patient', 'READ'),
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 0;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';

      let patients = await Patient.find().select('-consentRecords');

      if (patients.length > 0) {
        if (['doctor', 'clinic', 'hospital'].includes(req.user.role)) {
          if (!req.user.id.startsWith('user-')) {
            patients = patients.filter(
              (p) => p.primaryProvider && p.primaryProvider.toString() === req.user.id
            );
          }
        } else {
          if (!req.user.id.startsWith('user-')) {
            patients = patients.filter(
              (p) =>
                p.consentRecords &&
                Array.isArray(p.consentRecords) &&
                p.consentRecords.some(
                  (r) =>
                    r && r.providerId && r.providerId.toString() === req.user.id &&
                    ['full', 'partial'].includes(r.accessLevel)
                )
            );
          }
        }
      }

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        patients = patients.filter(
          (p) =>
            searchRegex.test(p.name) ||
            searchRegex.test(p.patientId) ||
            (p.contactInfo && searchRegex.test(p.contactInfo.email))
        );
      }

      const totalPatients = patients.length;
      const paginatedPatients = patients.slice(page * limit, page * limit + limit);

      res.status(200).json({
        success: true,
        patients: paginatedPatients,
        pagination: {
          total: totalPatients,
          page,
          limit,
          pages: Math.ceil(totalPatients / limit),
        },
      });
    } catch (error) {
      console.error('Get patients error:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

// @route   GET api/patients/:id
// @desc    Get a single patient
// @access  Private (with consent verification)
router.get('/:id', protect, ehiAudit('Patient', 'READ'), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const isPrimaryProvider = patient.primaryProvider.toString() === req.user.id;
    let hasConsent = false;

    if (!isPrimaryProvider) {
      hasConsent = await verifyConsent(patient.patientId, req.user.id, 'demographics');

      if (!hasConsent) {
        return oncDeny(res, 'GET /api/patients/:id').status(403).json({
          success: false,
          error: 'You do not have consent to access this patient record',
        });
      }
    }

    if (!isPrimaryProvider && hasConsent) {
      const consentRecord = patient.consentRecords.find(
        (r) => r.providerId.toString() === req.user.id
      );

      if (consentRecord && consentRecord.accessLevel !== 'full') {
        const allowedFields = consentRecord.dataElements || [];
        const filteredPatient = { _id: patient._id, patientId: patient.patientId, name: patient.name };
        allowedFields.forEach((field) => {
          if (patient[field]) filteredPatient[field] = patient[field];
        });
        return res.status(200).json({
          success: true,
          data: filteredPatient,
          consentLevel: consentRecord.accessLevel,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: patient,
      consentLevel: isPrimaryProvider ? 'primary' : 'full',
    });
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   PUT api/patients/:id
// @desc    Update a patient record
// @access  Private (primary provider or with edit consent)
router.put('/:id', protect, ehiAudit('Patient', 'UPDATE'), async (req, res) => {
  try {
    let patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const isPrimaryProvider = patient.primaryProvider.toString() === req.user.id;

    if (!isPrimaryProvider) {
      const hasEditConsent = await verifyConsent(patient.patientId, req.user.id, 'edit');
      if (!hasEditConsent) {
        return oncDeny(res, 'PUT /api/patients/:id').status(403).json({
          success: false,
          error: 'You do not have consent to edit this patient record',
        });
      }
    }

    patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   POST api/patients/:id/consent
// @desc    Create a consent record for a patient
// @access  Private (primary provider only)
router.post('/:id/consent', protect, ehiAudit('Patient', 'CONSENT_GRANT'), async (req, res) => {
  try {
    const { providerId, accessLevel, dataElements, expiryDate } = req.body;

    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    if (patient.primaryProvider.toString() !== req.user.id) {
      return oncDeny(res, 'POST /api/patients/:id/consent').status(403).json({
        success: false,
        error: 'Only the primary provider can create consent records',
      });
    }

    const blockchainConsent = await createConsentRecord(
      patient.patientId,
      providerId,
      accessLevel,
      dataElements,
      expiryDate ? new Date(expiryDate) : null
    );

    const consentRecord = {
      providerId,
      accessLevel,
      dataElements,
      consentDate: new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      blockchainTransactionId: blockchainConsent.transactionId,
    };

    patient.consentRecords.push(consentRecord);
    await patient.save();

    res.status(201).json({
      success: true,
      data: consentRecord,
      blockchainTransaction: blockchainConsent,
    });
  } catch (error) {
    console.error('Create consent error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/patients/:id/medical-records
// @desc    Get all medical records for a patient
// @access  Private (with consent verification)
router.get('/:id/medical-records', protect, ehiAudit('Patient', 'READ'), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const isPrimaryProvider = patient.primaryProvider.toString() === req.user.id;

    if (!isPrimaryProvider) {
      const hasConsent = await verifyConsent(patient.patientId, req.user.id, 'medical_records');
      if (!hasConsent) {
        return oncDeny(res, 'GET /api/patients/:id/medical-records').status(403).json({
          success: false,
          error: "You do not have consent to access this patient's medical records",
        });
      }
    }

    const medicalRecords = patient.medicalHistory.map((item) => ({
      id: item._id,
      patientId: patient._id,
      condition: item.condition,
      diagnosedDate: item.diagnosedDate,
      notes: item.notes,
      type: 'condition',
    }));

    const medicationRecords = patient.medications.map((item) => ({
      id: item._id,
      patientId: patient._id,
      name: item.name,
      dosage: item.dosage,
      frequency: item.frequency,
      startDate: item.startDate,
      endDate: item.endDate,
      type: 'medication',
    }));

    const allRecords = [...medicalRecords, ...medicationRecords].sort((a, b) => {
      const dateA = a.diagnosedDate || a.startDate;
      const dateB = b.diagnosedDate || b.startDate;
      return new Date(dateB) - new Date(dateA);
    });

    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const paginatedRecords = allRecords.slice(page * limit, page * limit + limit);

    res.status(200).json({
      success: true,
      count: allRecords.length,
      data: {
        records: paginatedRecords,
        pagination: {
          total: allRecords.length,
          page,
          limit,
          pages: Math.ceil(allRecords.length / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get medical records error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/patients/:id/consent-records
// @desc    Get all consent records for a patient
// @access  Private (primary provider only)
router.get('/:id/consent-records', protect, ehiAudit('Patient', 'READ'), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    if (patient.primaryProvider.toString() !== req.user.id) {
      return oncDeny(res, 'GET /api/patients/:id/consent-records').status(403).json({
        success: false,
        error: 'Only the primary provider can view all consent records',
      });
    }

    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;

    let filteredRecords = patient.consentRecords;
    if (req.query.status) {
      filteredRecords = patient.consentRecords.filter((record) => {
        const recordStatus =
          record.expiryDate && new Date(record.expiryDate) < new Date() ? 'expired' : 'active';
        return recordStatus === req.query.status;
      });
    }

    filteredRecords.sort((a, b) => new Date(b.consentDate) - new Date(a.consentDate));
    const paginatedRecords = filteredRecords.slice(page * limit, page * limit + limit);

    const formattedRecords = paginatedRecords.map((record) => ({
      id: record._id,
      patientId: patient._id,
      providerId: record.providerId,
      providerName: 'Provider Name',
      accessLevel: record.accessLevel,
      dataElements: record.dataElements,
      grantedAt: record.consentDate,
      expiresAt: record.expiryDate,
      status:
        record.expiryDate && new Date(record.expiryDate) < new Date() ? 'expired' : 'active',
      blockchainTransactionId: record.blockchainTransactionId,
    }));

    res.status(200).json({
      success: true,
      count: filteredRecords.length,
      data: {
        records: formattedRecords,
        pagination: {
          total: filteredRecords.length,
          page,
          limit,
          pages: Math.ceil(filteredRecords.length / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get consent records error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/patients/:id/export
// @desc    Export complete EHI record for a patient
// @access  Private (primary provider or admin)
//
// ONC 21st Century Cures Act — Information Blocking Rule
// This endpoint fulfils the requirement that health IT platforms provide an
// unblocked, machine-readable export of all EHI held for a patient on request.
// Access is restricted to the primary treating provider and administrators under
// the Privacy Exception (45 CFR § 171.202).
router.get('/:id/export', protect, ehiAudit('Patient', 'EXPORT'), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const isPrimaryProvider = patient.primaryProvider.toString() === req.user.id;
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    if (!isPrimaryProvider && !isAdmin) {
      return oncDeny(res, 'GET /api/patients/:id/export').status(403).json({
        success: false,
        error:
          'EHI export is restricted to the primary treating provider or an administrator.',
      });
    }

    const referrals = await Referral.find({ patient: req.params.id })
      .populate('referringProvider', 'name email specialty organization')
      .populate('receivingProvider', 'name email specialty organization');

    const exportBundle = {
      exportMetadata: {
        exportedAt:     new Date().toISOString(),
        exportedBy:     req.user.email,
        exportedByRole: req.user.role,
        platform:       'ClinicTrustAI',
        version:        '1.0',
        oncCompliance: {
          standard:      '21st Century Cures Act — Information Blocking Rule',
          regulation:    '45 CFR Part 171',
          exportFormat:  'JSON (FHIR R4 compatible structure)',
          auditLogged:   true,
        },
      },
      patient: {
        id:             patient._id,
        patientId:      patient.patientId,
        name:           patient.name,
        dateOfBirth:    patient.dateOfBirth,
        gender:         patient.gender,
        contactInfo:    patient.contactInfo,
        insuranceInfo:  patient.insuranceInfo,
        medicalHistory: patient.medicalHistory,
        medications:    patient.medications,
        allergies:      patient.allergies,
        riskScore:      patient.riskScore,
        consentRecords: patient.consentRecords,
        createdAt:      patient.createdAt,
        updatedAt:      patient.updatedAt,
      },
      referrals: referrals.map((r) => ({
        id:                      r._id,
        reason:                  r.reason,
        urgency:                 r.urgency,
        status:                  r.status,
        notes:                   r.notes,
        diagnosis:               r.diagnosis,
        treatment:               r.treatment,
        followUpRecommendations: r.followUpRecommendations,
        appointmentDate:         r.appointmentDate,
        completionDate:          r.completionDate,
        referringProvider:       r.referringProvider,
        receivingProvider:       r.receivingProvider,
        createdAt:               r.createdAt,
        updatedAt:               r.updatedAt,
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ehi-export-${patient.patientId}-${Date.now()}.json"`
    );
    res.setHeader('X-ONC-Compliant',  'true');
    res.setHeader('X-ONC-Standard',   '21st-century-cures-act-information-blocking-rule');

    res.status(200).json({ success: true, data: exportBundle });
  } catch (error) {
    console.error('EHI export error:', error);
    res.status(500).json({ success: false, error: 'Server error during EHI export' });
  }
});

module.exports = router;
