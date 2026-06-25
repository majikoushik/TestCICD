const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { generateMockNotifications } = require('./mockNotifications');
const Notification = require('../models/Notification');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://test:GTZdy5hZvLmHrML9@clinictrustai.591yw7n.mongodb.net/clinictrustai?retryWrites=true&w=majority&appName=ClinicTrustAI', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected for seeding notifications');
  seedNotifications();
})
.catch(err => {
  console.error('MongoDB connection error:', err.message);
  process.exit(1);
});

// Seed notifications
const seedNotifications = async () => {
  try {
    // Clear existing notifications
    await Notification.deleteMany({});
    console.log('Existing notifications cleared');
    
    // Generate mock notifications
    const mockNotifications = generateMockNotifications();
    
    // Insert mock notifications
    await Notification.insertMany(mockNotifications);
    console.log(`${mockNotifications.length} notifications seeded successfully`);
    
    // Disconnect from MongoDB
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Error seeding notifications:', error);
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed due to app termination');
    process.exit(0);
  });
});
