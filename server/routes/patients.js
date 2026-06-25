const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const { protect, authorize } = require('../middleware/auth');
const { createConsentRecord, verifyConsent } = require('../blockchain/contracts');

// @route   POST api/patients
// @desc    Create a new patient record
// @access  Private (doctors, clinics, hospitals)
router.post('/', protect, authorize('doctor', 'clinic', 'hospital'), async (req, res) => {
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
      allergies
    } = req.body;

    // Check if patient already exists
    let patient = await Patient.findOne({ patientId });
    if (patient) {
      return res.status(400).json({ success: false, error: 'Patient already exists' });
    }

    // Create new patient
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
      allergies: allergies || []
    });

    // Save patient to database
    await patient.save();

    res.status(201).json({
      success: true,
      data: patient
    });
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/patients
// @desc    Get all patients for the provider
// @access  Private (all healthcare providers)
router.get('/', protect, authorize('doctor', 'clinic', 'hospital', 'lab'), async (req, res) => {
  try {
    // Extract pagination, sorting and filtering parameters
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'lastName';
    const sortOrder = req.query.sortOrder || 'asc';
    const riskLevel = req.query.riskLevel || 'all';
    
    console.log('User ID:', req.user.id);
    console.log('User Role:', req.user.role);
    
    // For development/testing, get all patients regardless of provider
    // This will help us see if there are any patients in the database
    let patients = await Patient.find().select('-consentRecords');
    console.log('Total patients in DB:', patients.length);
    
    // If we have patients, then we can apply the filtering
    if (patients.length > 0) {
      if (['doctor', 'clinic', 'hospital'].includes(req.user.role)) {
        // For development with string IDs, don't filter by provider yet
        if (req.user.id.startsWith('user-')) {
          console.log('Using development mode with string IDs');
          // Keep all patients for now to see data
        } else {
          // Normal ObjectId comparison in database query
          patients = patients.filter(patient => 
            patient.primaryProvider && 
            patient.primaryProvider.toString() === req.user.id
          );
        }
      } else {
        // For labs, similar approach but with consent records
        if (req.user.id.startsWith('user-')) {
          // Keep all patients in dev mode
        } else {
          // Filter by consent in production
          patients = patients.filter(patient => {
            return patient.consentRecords && 
                  Array.isArray(patient.consentRecords) &&
                  patient.consentRecords.some(record => 
                    record && 
                    record.providerId && 
                    record.providerId.toString() === req.user.id && 
                    ['full', 'partial'].includes(record.accessLevel)
                  );
          });
        }
      }
    }
    
    // Apply search filter if provided
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      patients = patients.filter(patient => 
        searchRegex.test(patient.name) || 
        searchRegex.test(patient.patientId) ||
        (patient.contactInfo && searchRegex.test(patient.contactInfo.email))
      );
    }
    
    // Apply risk level filter if provided
    if (riskLevel !== 'all') {
      // Risk level filtering logic...
    }
    
    // Sort and paginate as before...
    
    // Calculate pagination
    const totalPatients = patients.length;
    const startIndex = page * limit;
    const endIndex = startIndex + limit;
    const paginatedPatients = patients.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      patients: paginatedPatients,
      pagination: {
        total: totalPatients,
        page: page,
        limit: limit,
        pages: Math.ceil(totalPatients / limit)
      }
    });
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/patients/:id
// @desc    Get a single patient
// @access  Private (with consent verification)
router.get('/:id', protect, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Check if user is the primary provider or has consent
    const isPrimaryProvider = patient.primaryProvider.toString() === req.user.id;
    let hasConsent = false;
    
    if (!isPrimaryProvider) {
      // Check blockchain for consent
      hasConsent = await verifyConsent(
        patient.patientId,
        req.user.id,
        'demographics' // Basic info
      );
      
      if (!hasConsent) {
        return res.status(403).json({
          success: false,
          error: 'You do not have consent to access this patient record'
        });
      }
    }

    // If not primary provider and limited consent, filter data
    if (!isPrimaryProvider && hasConsent) {
      // Find the specific consent record
      const consentRecord = patient.consentRecords.find(
        record => record.providerId.toString() === req.user.id
      );
      
      if (consentRecord && consentRecord.accessLevel !== 'full') {
        // Filter patient data based on consent
        const allowedFields = consentRecord.dataElements || [];
        const filteredPatient = {
          _id: patient._id,
          patientId: patient.patientId,
          name: patient.name
        };
        
        // Add allowed fields
        allowedFields.forEach(field => {
          if (patient[field]) {
            filteredPatient[field] = patient[field];
          }
        });
        
        return res.status(200).json({
          success: true,
          data: filteredPatient,
          consentLevel: consentRecord.accessLevel
        });
      }
    }

    res.status(200).json({
      success: true,
      data: patient,
      consentLevel: isPrimaryProvider ? 'primary' : 'full'
    });
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   PUT api/patients/:id
// @desc    Update a patient record
// @access  Private (primary provider or with edit consent)
router.put('/:id', protect, async (req, res) => {
  try {
    let patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Check if user is the primary provider or has edit consent
    const isPrimaryProvider = patient.primaryProvider.toString() === req.user.id;
    let hasEditConsent = false;
    
    if (!isPrimaryProvider) {
      // Check blockchain for consent
      hasEditConsent = await verifyConsent(
        patient.patientId,
        req.user.id,
        'edit'
      );
      
      if (!hasEditConsent) {
        return res.status(403).json({
          success: false,
          error: 'You do not have consent to edit this patient record'
        });
      }
    }

    // Update patient
    patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: patient
    });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   POST api/patients/:id/consent
// @desc    Create a consent record for a patient
// @access  Private (primary provider only)
router.post('/:id/consent', protect, async (req, res) => {
  try {
    const {
      providerId,
      accessLevel,
      dataElements,
      expiryDate
    } = req.body;

    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Check if user is the primary provider
    if (patient.primaryProvider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Only the primary provider can create consent records'
      });
    }

    // Create consent record on blockchain
    const blockchainConsent = await createConsentRecord(
      patient.patientId,
      providerId,
      accessLevel,
      dataElements,
      expiryDate ? new Date(expiryDate) : null
    );

    // Add consent record to patient
    const consentRecord = {
      providerId,
      accessLevel,
      dataElements,
      consentDate: new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      blockchainTransactionId: blockchainConsent.transactionId
    };

    patient.consentRecords.push(consentRecord);
    await patient.save();

    res.status(201).json({
      success: true,
      data: consentRecord,
      blockchainTransaction: blockchainConsent
    });
  } catch (error) {
    console.error('Create consent error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/patients/:id/medical-records
// @desc    Get all medical records for a patient
// @access  Private (with consent verification)
router.get('/:id/medical-records', protect, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Check if user is the primary provider or has consent
    const isPrimaryProvider = patient.primaryProvider.toString() === req.user.id;
    let hasConsent = false;
    
    if (!isPrimaryProvider) {
      // Check blockchain for consent
      hasConsent = await verifyConsent(
        patient.patientId,
        req.user.id,
        'medical_records' // Medical records access
      );
      
      if (!hasConsent) {
        return res.status(403).json({
          success: false,
          error: 'You do not have consent to access this patient\'s medical records'
        });
      }
    }

    // Return the medical history as records
    const medicalRecords = patient.medicalHistory.map(item => ({
      id: item._id,
      patientId: patient._id,
      condition: item.condition,
      diagnosedDate: item.diagnosedDate,
      notes: item.notes,
      type: 'condition'
    }));

    // Add medications as records
    const medicationRecords = patient.medications.map(item => ({
      id: item._id,
      patientId: patient._id,
      name: item.name,
      dosage: item.dosage,
      frequency: item.frequency,
      startDate: item.startDate,
      endDate: item.endDate,
      type: 'medication'
    }));

    // Combine and sort by date
    const allRecords = [...medicalRecords, ...medicationRecords].sort((a, b) => {
      const dateA = a.diagnosedDate || a.startDate;
      const dateB = b.diagnosedDate || b.startDate;
      return new Date(dateB) - new Date(dateA);
    });

    // Handle pagination
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = page * limit;
    const endIndex = startIndex + limit;
    const paginatedRecords = allRecords.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      count: allRecords.length,
      data: {
        records: paginatedRecords,
        pagination: {
          total: allRecords.length,
          page: page,
          limit: limit,
          pages: Math.ceil(allRecords.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get medical records error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/patients/:id/consent-records
// @desc    Get all consent records for a patient
// @access  Private (primary provider only)
router.get('/:id/consent-records', protect, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Check if user is the primary provider
    if (patient.primaryProvider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Only the primary provider can view all consent records'
      });
    }

    // Handle pagination
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = page * limit;
    const endIndex = startIndex + limit;
    
    // Filter by status if provided
    let filteredRecords = patient.consentRecords;
    if (req.query.status) {
      const status = req.query.status;
      filteredRecords = patient.consentRecords.filter(record => {
        // Map the status based on expiry date and other factors
        const recordStatus = record.expiryDate && new Date(record.expiryDate) < new Date() ? 'expired' : 'active';
        return recordStatus === status;
      });
    }
    
    // Sort by consent date (newest first)
    filteredRecords.sort((a, b) => new Date(b.consentDate) - new Date(a.consentDate));
    
    // Paginate
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex);
    
    // Format records to match client expectations
    const formattedRecords = paginatedRecords.map(record => ({
      id: record._id,
      patientId: patient._id,
      providerId: record.providerId,
      providerName: 'Provider Name', // In a real app, would fetch provider name
      accessLevel: record.accessLevel,
      dataElements: record.dataElements,
      grantedAt: record.consentDate,
      expiresAt: record.expiryDate,
      status: record.expiryDate && new Date(record.expiryDate) < new Date() ? 'expired' : 'active',
      blockchainTransactionId: record.blockchainTransactionId
    }));
    
    res.status(200).json({
      success: true,
      count: filteredRecords.length,
      data: {
        records: formattedRecords,
        pagination: {
          total: filteredRecords.length,
          page: page,
          limit: limit,
          pages: Math.ceil(filteredRecords.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get consent records error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
