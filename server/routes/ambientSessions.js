const express = require('express');
const router = express.Router();
const multer = require('multer');
const AmbientSession = require('../models/AmbientSession');
const ambientIntelligenceService = require('../services/ambientIntelligenceService');
const logger = require('../utils/logger');

// Audio is transcribed immediately and never persisted, so memory storage is fine.
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB — a few minutes of compressed audio
});

// POST /transcribe — server-side speech-to-text for a recorded encounter clip.
// MUST come before /:id to avoid routing conflict.
// Safe to call unconditionally: when AZURE_SPEECH_KEY/REGION aren't configured,
// ambientIntelligenceService.transcribeAudio() returns a stub response instead
// of erroring, so the client can always fall back to its own Web Speech API
// transcript with no special-casing required.
router.post('/transcribe', audioUpload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file provided' });
    }

    const result = await ambientIntelligenceService.transcribeAudio(req.file.buffer, req.file.mimetype);

    if (!result.success) {
      return res.status(502).json({ success: false, error: result.error || 'Transcription failed' });
    }

    return res.status(200).json({
      success: true,
      stub: Boolean(result.stub),
      transcript: result.transcript || '',
    });
  } catch (err) {
    logger.error('POST /transcribe error', logger.reqCtx(req, err));
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /stats - Stats for the current provider's sessions
// MUST come before /:id to avoid routing conflict
router.get('/stats', async (req, res) => {
  try {
    const providerId = req.user._id;

    const sessions = await AmbientSession.find({ providerId });

    const total = sessions.length;

    const byStatus = {};
    const byUrgency = {};
    let totalDuration = 0;
    let durationCount = 0;

    sessions.forEach((session) => {
      // Count by status
      if (session.status) {
        byStatus[session.status] = (byStatus[session.status] || 0) + 1;
      }

      // Count by urgency
      if (session.urgencyClassification) {
        byUrgency[session.urgencyClassification] =
          (byUrgency[session.urgencyClassification] || 0) + 1;
      }

      // Accumulate duration
      if (session.recordingDuration !== null && session.recordingDuration !== undefined) {
        totalDuration += session.recordingDuration;
        durationCount += 1;
      }
    });

    const avgDuration = durationCount > 0 ? totalDuration / durationCount : 0;

    return res.status(200).json({
      success: true,
      data: {
        total,
        byStatus,
        byUrgency,
        avgDuration,
      },
    });
  } catch (err) {
    logger.error('GET /stats error', logger.reqCtx(req, err));
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /my-sessions - Alias for GET /
router.get('/my-sessions', async (req, res) => {
  try {
    const providerId = req.user._id;
    const { status, urgency, patientId } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;

    const filter = { providerId };
    if (status) filter.status = status;
    if (urgency) filter.urgencyClassification = urgency;
    if (patientId) filter.patientId = patientId;

    const total = await AmbientSession.countDocuments(filter);
    const sessions = await AmbientSession.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: { sessions, total, page, limit },
    });
  } catch (err) {
    logger.error('GET /my-sessions error', logger.reqCtx(req, err));
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET / - List sessions for the current provider
router.get('/', async (req, res) => {
  try {
    const providerId = req.user._id;
    const { status, urgency, patientId } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;

    const filter = { providerId };
    if (status) filter.status = status;
    if (urgency) filter.urgencyClassification = urgency;
    if (patientId) filter.patientId = patientId;

    const total = await AmbientSession.countDocuments(filter);
    const sessions = await AmbientSession.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: { sessions, total, page, limit },
    });
  } catch (err) {
    logger.error('GET / error', logger.reqCtx(req, err));
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST / - Create a new session
router.post('/', async (req, res) => {
  try {
    const {
      patientId,
      patientName,
      patientDOB,
      patientInsurance,
      chiefComplaint,
      audioTranscript,
      recordingDuration,
    } = req.body;

    // Validate required fields
    if (!patientId || !patientName || !chiefComplaint) {
      return res.status(400).json({
        success: false,
        message: 'patientId, patientName, and chiefComplaint are required',
      });
    }

    const sessionId = 'ACI-' + Date.now();
    const providerId = req.user._id;
    const providerName = req.user.name || req.user.email;

    // Create and save the session with draft status
    const session = new AmbientSession({
      sessionId,
      providerId,
      providerName,
      patientId,
      patientName,
      patientDOB,
      patientInsurance,
      chiefComplaint,
      audioTranscript,
      recordingDuration,
      status: 'draft',
    });

    await session.save();

    // Trigger AI processing
    try {
      const aiResult = await ambientIntelligenceService.processAmbientSession(
        session.sessionId,
        audioTranscript,
        { patientName, chiefComplaint, patientDOB, patientInsurance }
      );

      session.clinicalSummary = aiResult.clinicalSummary;
      session.referralNoteDraft = aiResult.referralNoteDraft;
      session.urgencyClassification = aiResult.urgencyClassification;
      session.urgencyReason = aiResult.urgencyReason;
      session.icdCodes = aiResult.icdCodes;
      session.recommendedSpecialty = aiResult.recommendedSpecialty;
      session.status = 'reviewing';

      await session.save();
    } catch (aiErr) {
      logger.error('AI processing failed for session ' + sessionId, logger.reqCtx(req, aiErr));
      session.processingError = aiErr.message || 'AI processing failed';
      await session.save();
    }

    return res.status(201).json({ success: true, data: session });
  } catch (err) {
    logger.error('POST / error', logger.reqCtx(req, err));
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /:id - Get single session by _id
router.get('/:id', async (req, res) => {
  try {
    const session = await AmbientSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const isAdmin =
      req.user.role === 'admin' || req.user.role === 'superadmin';
    const isOwner = session.providerId.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this session' });
    }

    return res.status(200).json({ success: true, data: session });
  } catch (err) {
    logger.error('GET /:id error', logger.reqCtx(req, err));
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /:id/review - Provider submits their review
router.put('/:id/review', async (req, res) => {
  try {
    const session = await AmbientSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const isAdmin =
      req.user.role === 'admin' || req.user.role === 'superadmin';
    const isOwner = session.providerId.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to review this session' });
    }

    const { action, approvedNote, urgencyClassification } = req.body;

    if (action === 'approve') {
      // Track edit history if approvedNote changed
      if (approvedNote && approvedNote !== session.approvedNote) {
        if (!session.editHistory) session.editHistory = [];
        session.editHistory.push({
          editedBy: req.user._id,
          editedAt: new Date(),
          previousNote: session.approvedNote || '',
          newNote: approvedNote,
        });
      }

      session.status = 'approved';
      session.approvedNote = approvedNote;
      session.reviewedBy = req.user._id;
      session.reviewedAt = new Date();
    } else if (action === 'reject') {
      session.status = 'rejected';
      session.reviewedBy = req.user._id;
      session.reviewedAt = new Date();
    } else {
      return res.status(400).json({ success: false, message: 'action must be "approve" or "reject"' });
    }

    if (urgencyClassification) {
      session.urgencyClassification = urgencyClassification;
    }

    await session.save();

    return res.status(200).json({ success: true, data: session });
  } catch (err) {
    logger.error('PUT /:id/review error', logger.reqCtx(req, err));
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /:id - Update editable fields of a draft/reviewing session
router.put('/:id', async (req, res) => {
  try {
    const session = await AmbientSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const isAdmin =
      req.user.role === 'admin' || req.user.role === 'superadmin';
    const isOwner = session.providerId.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this session' });
    }

    if (session.status !== 'draft' && session.status !== 'reviewing') {
      return res.status(400).json({
        success: false,
        message: 'Session can only be updated when in draft or reviewing status',
      });
    }

    const allowedFields = [
      'patientId',
      'patientName',
      'patientDOB',
      'patientInsurance',
      'chiefComplaint',
      'audioTranscript',
      'recordingDuration',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        session[field] = req.body[field];
      }
    });

    await session.save();

    return res.status(200).json({ success: true, data: session });
  } catch (err) {
    logger.error('PUT /:id error', logger.reqCtx(req, err));
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /:id/reprocess - Re-trigger AI processing
router.post('/:id/reprocess', async (req, res) => {
  try {
    const session = await AmbientSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const isAdmin =
      req.user.role === 'admin' || req.user.role === 'superadmin';
    const isOwner = session.providerId.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to reprocess this session' });
    }

    const aiResult = await ambientIntelligenceService.processAmbientSession(
      session.sessionId,
      session.audioTranscript,
      {
        patientName: session.patientName,
        chiefComplaint: session.chiefComplaint,
        patientDOB: session.patientDOB,
        patientInsurance: session.patientInsurance,
      }
    );

    session.clinicalSummary = aiResult.clinicalSummary;
    session.referralNoteDraft = aiResult.referralNoteDraft;
    session.urgencyClassification = aiResult.urgencyClassification;
    session.urgencyReason = aiResult.urgencyReason;
    session.icdCodes = aiResult.icdCodes;
    session.recommendedSpecialty = aiResult.recommendedSpecialty;
    session.status = 'reviewing';
    session.processingError = undefined;

    await session.save();

    return res.status(200).json({ success: true, data: session });
  } catch (err) {
    logger.error('POST /:id/reprocess error', logger.reqCtx(req, err));
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /:id - Delete session if status is draft or rejected
router.delete('/:id', async (req, res) => {
  try {
    const session = await AmbientSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const isAdmin =
      req.user.role === 'admin' || req.user.role === 'superadmin';
    const isOwner = session.providerId.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this session' });
    }

    if (session.status !== 'draft' && session.status !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Only draft or rejected sessions can be deleted',
      });
    }

    await session.deleteOne();

    return res.status(200).json({ success: true, message: 'Session deleted successfully' });
  } catch (err) {
    logger.error('DELETE /:id error', logger.reqCtx(req, err));
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
