const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    referralId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Referral',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Denormalized for display — avoids extra joins on every read
    senderName: { type: String, required: true },
    senderRole: { type: String },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverName: { type: String, required: true },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
      trim: true,
    },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index: fetch all messages in a thread in order
MessageSchema.index({ referralId: 1, createdAt: 1 });
// Find all threads for a given participant
MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ receiverId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', MessageSchema);
