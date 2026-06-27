const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { generateMockNotifications } = require('./mockNotifications');
const Notification = require('../models/Notification');
const logger = require('./logger');

dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://test:GTZdy5hZvLmHrML9@clinictrustai.591yw7n.mongodb.net/clinictrustai?retryWrites=true&w=majority&appName=ClinicTrustAI', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  logger.info('MongoDB connected for seeding notifications');
  seedNotifications();
})
.catch((err) => {
  logger.error('MongoDB connection error during notification seeding', { error: err.message, stack: err.stack });
  process.exit(1);
});

const seedNotifications = async () => {
  try {
    await Notification.deleteMany({});
    logger.info('Existing notifications cleared');

    const mockNotifications = generateMockNotifications();

    await Notification.insertMany(mockNotifications);
    logger.info(`${mockNotifications.length} notifications seeded successfully`);

    mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error seeding notifications', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    logger.info('MongoDB connection closed due to app termination');
    process.exit(0);
  });
});
