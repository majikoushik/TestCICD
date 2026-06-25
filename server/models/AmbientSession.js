const mongoose = require('mongoose');

const editHistorySchema = new mongoose.Schema(
  {
    editedAt: {
      type: Date,
      default: Date.now,
    },
    editedBy: {
      type: String,
    },
    previousNote: {
      type: String,
    },
    newNote: {
      type: String,
    },
  },
  { _id: false }
);

const ambientSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  providerName: {
    type: String,
  },
  patientId: {
    type: String,
    required: true,
    index: true,
  },
  patientName: {
    type: String,
    required: true,
  },
  patientDOB: {
    type: Date,
  },
  patientInsurance: {
    type: String,
  },
  chiefComplaint: {
    type: String,
    required: true,
  },
  recordingDuration: {
    type: Number,
    default: 0,
  },
  audioTranscript: {
    type: String,
  },
  clinicalSummary: {
    type: String,
  },
  referralNoteDraft: {
    type: String,
  },
  urgencyClassification: {
    type: String,
    enum: ['routine', 'urgent', 'emergent'],
    default: 'routine',
  },
  urgencyReason: {
    type: String,
  },
  icdCodes: {
    type: [String],
  },
  recommendedSpecialty: {
    type: String,
  },
  status: {
    type: String,
    enum: ['draft', 'reviewing', 'approved', 'rejected', 'submitted'],
    default: 'draft',
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: {
    type: Date,
  },
  approvedNote: {
    type: String,
  },
  editHistory: {
    type: [editHistorySchema],
    default: [],
  },
  linkedReferralId: {
    type: String,
  },
  processingError: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

ambientSessionSchema.index({ providerId: 1, status: 1 });
ambientSessionSchema.index({ patientId: 1, createdAt: -1 });

ambientSessionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('AmbientSession', ambientSessionSchema);
