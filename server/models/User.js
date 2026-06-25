const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  _id: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'doctor', 'lab', 'clinic', 'hospital', 'provider', 'reviewer', 'superadmin'],
    default: 'doctor'
  },
  organization: {
    type: String,
    required: true
  },
  specialty: String,
  blockchainId: {
    type: String,
    unique: true,
    sparse: true
  },
  walletAddress: {
    type: String,
    unique: true,
    sparse: true
  },
  tokenBalance: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: Date,
  // New fields for provider management
  isActive: {
    type: Boolean,
    default: true
  },
  accountStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  kycVerified: {
    type: Boolean,
    default: false
  },
  kycDocuments: {
    licenseNumber: String,
    licenseExpiry: Date,
    verificationDocuments: [String], // Array of document URLs
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockedUntil: Date,
  lastFailedLogin: Date,
  loginHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String,
    successful: Boolean
  }]
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
