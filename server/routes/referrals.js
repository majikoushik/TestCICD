const express = require('express');
const router = express.Router();
const Referral = require('../models/Referral');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { createReferralContract, updateReferralContract, verifyConsent } = require('../blockchain/contracts');
const { processTokenTransaction } = require('../blockchain/contracts');

// @route   POST api/referrals
// @desc    Create a new referral
// @access  Private (doctors, clinics, hospitals)
router.post('/', protect, authorize('doctor', 'clinic', 'hospital'), async (req, res) => {
  try {
    const {
      patientId,
      receivingProviderId,
      reason,
      urgency,
      notes,
      attachedRecords,
      appointmentDate
    } = req.body;

    // Check if patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Check if receiving provider exists
    const receivingProvider = await User.findById(receivingProviderId);
    if (!receivingProvider) {
      return res.status(404).json({ success: false, error: 'Receiving provider not found' });
    }

    // Check if user has permission to refer this patient
    const isPrimaryProvider = patient.primaryProvider.toString() === req.user.id;
    let hasReferPermission = false;
    
    if (!isPrimaryProvider) {
      // Check blockchain for consent
      hasReferPermission = await verifyConsent(
        patient.patientId,
        req.user.id,
        'refer'
      );
      
      if (!hasReferPermission) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to refer this patient'
        });
      }
    }

    // Create new referral
    const referral = new Referral({
      patient: patientId,
      referringProvider: req.user.id,
      receivingProvider: receivingProviderId,
      reason,
      urgency: urgency || 'routine',
      notes,
      attachedRecords: attachedRecords || [],
      appointmentDate: appointmentDate ? new Date(appointmentDate) : undefined,
      billing: {
        status: 'pending'
      }
    });

    // Create referral contract on blockchain
    const blockchainReferral = await createReferralContract(referral);

    // Update referral with blockchain data
    referral.billing.smartContractId = blockchainReferral.contractId;
    referral.billing.transactionId = blockchainReferral.transactionId;

    // Save referral to database
    await referral.save();

    res.status(201).json({
      success: true,
      data: referral,
      blockchainTransaction: blockchainReferral
    });
  } catch (error) {
    console.error('Create referral error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/referrals
// @desc    Get all referrals for the provider (sent or received)
// @access  Private (all healthcare providers)
router.get('/', protect, authorize('doctor', 'clinic', 'hospital', 'lab'), async (req, res) => {
  try {
    const { type, status } = req.query;
    let query = {};

    // Filter by type (sent or received)
    if (type === 'sent') {
      query.referringProvider = req.user.id;
    } else if (type === 'received') {
      query.receivingProvider = req.user.id;
    } else {
      // Default: get both sent and received
      query.$or = [
        { referringProvider: req.user.id },
        { receivingProvider: req.user.id }
      ];
    }

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Get referrals
    const referrals = await Referral.find(query)
      .populate('patient', 'patientId name dateOfBirth gender')
      .populate('referringProvider', 'name organization specialty')
      .populate('receivingProvider', 'name organization specialty')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: referrals.length,
      data: referrals
    });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/referrals/:id
// @desc    Get a single referral
// @access  Private (referring or receiving provider only)
router.get('/:id', protect, async (req, res) => {
  try {
    const referral = await Referral.findById(req.params.id)
      .populate('patient', 'patientId name dateOfBirth gender contactInfo')
      .populate('referringProvider', 'name organization specialty')
      .populate('receivingProvider', 'name organization specialty');
    
    if (!referral) {
      return res.status(404).json({ success: false, error: 'Referral not found' });
    }

    // Check if user is the referring or receiving provider
    if (
      referral.referringProvider._id.toString() !== req.user.id &&
      referral.receivingProvider._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to view this referral'
      });
    }

    res.status(200).json({
      success: true,
      data: referral
    });
  } catch (error) {
    console.error('Get referral error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   PUT api/referrals/:id/status
// @desc    Update referral status
// @access  Private (referring or receiving provider only)
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, notes, diagnosis, treatment, followUpRecommendations } = req.body;
    
    const referral = await Referral.findById(req.params.id);
    
    if (!referral) {
      return res.status(404).json({ success: false, error: 'Referral not found' });
    }

    // Check if user is the referring or receiving provider
    const isReferringProvider = referral.referringProvider.toString() === req.user.id;
    const isReceivingProvider = referral.receivingProvider.toString() === req.user.id;
    
    if (!isReferringProvider && !isReceivingProvider) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to update this referral'
      });
    }

    // Validate status transitions
    const validStatusTransitions = {
      pending: ['accepted', 'rejected', 'cancelled'],
      accepted: ['completed', 'cancelled'],
      completed: [],
      rejected: [],
      cancelled: []
    };

    if (!validStatusTransitions[referral.status].includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot transition from ${referral.status} to ${status}`
      });
    }

    // Update referral status on blockchain
    const updateData = { status };
    if (notes) updateData.notes = notes;
    if (diagnosis) updateData.diagnosis = diagnosis;
    if (treatment) updateData.treatment = treatment;
    if (followUpRecommendations) updateData.followUpRecommendations = followUpRecommendations;

    const blockchainUpdate = await updateReferralContract(
      referral.billing.transactionId,
      status,
      updateData
    );

    // Update referral in database
    referral.status = status;
    if (notes) referral.notes = notes;
    if (diagnosis) referral.diagnosis = diagnosis;
    if (treatment) referral.treatment = treatment;
    if (followUpRecommendations) referral.followUpRecommendations = followUpRecommendations;

    if (status === 'completed') {
      referral.completionDate = new Date();
      
      // Process token rewards for completed referrals
      try {
        // Reward tokens to both providers for completing the referral
        const referringTokens = await processTokenTransaction(
          'system',
          referral.referringProvider.toString(),
          5, // Token amount
          'Referral completion reward',
          { referralId: referral._id.toString() }
        );
        
        const receivingTokens = await processTokenTransaction(
          'system',
          referral.receivingProvider.toString(),
          10, // Token amount
          'Referral handling reward',
          { referralId: referral._id.toString() }
        );
        
        // Update user token balances
        await User.findByIdAndUpdate(
          referral.referringProvider,
          { $inc: { tokenBalance: 5 } }
        );
        
        await User.findByIdAndUpdate(
          referral.receivingProvider,
          { $inc: { tokenBalance: 10 } }
        );
        
        // Store token transaction IDs
        referral.billing.tokenTransactions = {
          referring: referringTokens.transactionId,
          receiving: receivingTokens.transactionId
        };
      } catch (tokenError) {
        console.error('Token reward error:', tokenError);
        // Continue even if token rewards fail
      }
    }

    await referral.save();

    res.status(200).json({
      success: true,
      data: referral,
      blockchainTransaction: blockchainUpdate
    });
  } catch (error) {
    console.error('Update referral status error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   PUT api/referrals/:id/billing
// @desc    Update referral billing information
// @access  Private (receiving provider only)
router.put('/:id/billing', protect, async (req, res) => {
  try {
    const { amount, currency, insuranceClaim } = req.body;
    
    const referral = await Referral.findById(req.params.id);
    
    if (!referral) {
      return res.status(404).json({ success: false, error: 'Referral not found' });
    }

    // Check if user is the receiving provider
    if (referral.receivingProvider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Only the receiving provider can update billing information'
      });
    }

    // Update billing information
    referral.billing.amount = amount || referral.billing.amount;
    referral.billing.currency = currency || referral.billing.currency;
    
    if (insuranceClaim) {
      referral.billing.insuranceClaim = {
        ...referral.billing.insuranceClaim,
        ...insuranceClaim,
        submissionDate: insuranceClaim.submissionDate ? new Date(insuranceClaim.submissionDate) : new Date()
      };
    }

    // Update blockchain contract
    const blockchainUpdate = await updateReferralContract(
      referral.billing.transactionId,
      referral.status,
      { billing: referral.billing }
    );

    await referral.save();

    res.status(200).json({
      success: true,
      data: referral.billing,
      blockchainTransaction: blockchainUpdate
    });
  } catch (error) {
    console.error('Update referral billing error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
