/**
 * Mock notification data for development and testing
 */
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

// Create some mock user IDs for testing
const mockUserIds = [
  new ObjectId('60d0fe4f5311236168a109ca'),
  new ObjectId('60d0fe4f5311236168a109cb'),
  new ObjectId('60d0fe4f5311236168a109cc')
];

// Mock referral IDs
const mockReferralIds = [
  new ObjectId('60d0fe4f5311236168a109d1'),
  new ObjectId('60d0fe4f5311236168a109d2'),
  new ObjectId('60d0fe4f5311236168a109d3')
];

// Generate mock notifications
const generateMockNotifications = () => {
  const notifications = [];
  
  // Create various notification types for each user
  mockUserIds.forEach(userId => {
    // Referral notifications
    notifications.push({
      userId,
      title: 'New Referral Request',
      message: 'You have received a new patient referral request.',
      type: 'referral',
      read: false,
      relatedId: mockReferralIds[0],
      link: '/referrals/details/' + mockReferralIds[0],
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)) // Random time in the last week
    });
    
    notifications.push({
      userId,
      title: 'Referral Accepted',
      message: 'Your referral request has been accepted.',
      type: 'success',
      read: Math.random() > 0.5, // Randomly mark some as read
      relatedId: mockReferralIds[1],
      link: '/referrals/details/' + mockReferralIds[1],
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000)) // Random time in the last 2 weeks
    });
    
    // Token notifications
    notifications.push({
      userId,
      title: 'Tokens Earned',
      message: 'You earned 50 tokens for completing a patient outcome report.',
      type: 'token',
      read: Math.random() > 0.7,
      link: '/blockchain/history',
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 10 * 24 * 60 * 60 * 1000)) // Random time in the last 10 days
    });
    
    // System notifications
    notifications.push({
      userId,
      title: 'System Maintenance',
      message: 'The system will be down for maintenance on Sunday from 2-4 AM EST.',
      type: 'info',
      read: Math.random() > 0.3,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 5 * 24 * 60 * 60 * 1000)) // Random time in the last 5 days
    });
    
    // AI-related notifications
    notifications.push({
      userId,
      title: 'AI Risk Assessment Complete',
      message: 'The AI has completed a risk assessment for your patient.',
      type: 'info',
      read: Math.random() > 0.6,
      link: '/patients/details/60d0fe4f5311236168a109d5',
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000)) // Random time in the last 3 days
    });
  });
  
  return notifications;
};

module.exports = {
  generateMockNotifications
};
