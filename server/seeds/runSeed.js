const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const { seedPriorAuths } = require('./priorAuthSeed');
const { seedPatientEngagement } = require('./patientEngagementSeed');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas');
    await seedPriorAuths();
    await seedPatientEngagement();
    console.log('Done.');
  } catch (err) {
    console.error('Seed failed:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

run();
