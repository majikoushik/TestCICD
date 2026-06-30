/**
 * seedDefaults — called once after MongoDB connects.
 * Inserts default ConversionRule and TokenCatalog documents if the collections
 * are empty so the platform works out of the box without running populate_db.js.
 */
const logger = require('./logger');

const DEFAULT_CATALOG = [
  {
    serviceId: 'ai-analysis-basic',
    name: 'Basic AI Analysis',
    description: 'Run basic AI analysis on your patient data to identify patterns and risks.',
    category: 'analytics',
    tokenCost: 10,
    tier: 'basic',
    features: ['Patient risk scoring', 'Trend detection', 'PDF export'],
    iconName: 'Analytics',
    sortOrder: 1,
    isActive: true,
  },
  {
    serviceId: 'ai-analysis-advanced',
    name: 'Advanced AI Analysis',
    description: 'Run advanced AI analysis with predictive modeling and deep insights.',
    category: 'analytics',
    tokenCost: 25,
    tier: 'premium',
    features: ['Predictive modeling', 'Comorbidity mapping', 'Benchmark comparisons', 'Raw data export'],
    iconName: 'AutoAwesome',
    sortOrder: 2,
    isActive: true,
  },
  {
    serviceId: 'priority-referral',
    name: 'Priority Referral Processing',
    description: 'Get priority handling for your referrals — jump the queue.',
    category: 'operations',
    tokenCost: 5,
    tier: 'basic',
    features: ['Same-day processing', 'Dedicated queue', 'Status notifications'],
    iconName: 'FastForward',
    sortOrder: 3,
    isActive: true,
  },
  {
    serviceId: 'pa-fast-track',
    name: 'PA Fast-Track',
    description: 'Skip the queue and get priority prior authorization review.',
    category: 'priority',
    tokenCost: 10,
    tier: 'standard',
    features: ['Priority review', 'Expedited decision', 'Dedicated reviewer'],
    iconName: 'Speed',
    sortOrder: 4,
    isActive: true,
  },
  {
    serviceId: 'extended-data-access',
    name: 'Extended Network Data Access',
    description: 'Access anonymized data from the entire ClinicTrust network for research.',
    category: 'research',
    tokenCost: 50,
    tier: 'premium',
    features: ['Full network data', 'Anonymized records', 'Research exports', 'API access'],
    iconName: 'Storage',
    sortOrder: 5,
    isActive: true,
  },
  {
    serviceId: 'premium-support',
    name: 'Premium Support',
    description: 'Get priority technical support with a dedicated support agent.',
    category: 'support',
    tokenCost: 15,
    tier: 'standard',
    features: ['Priority queue', '4-hour SLA', 'Dedicated agent', 'Phone support'],
    iconName: 'Support',
    sortOrder: 6,
    isActive: true,
  },
  {
    serviceId: 'premium-export',
    name: 'Premium Analytics Export',
    description: 'Export full analytics results with raw data and interactive visualizations.',
    category: 'analytics',
    tokenCost: 25,
    tier: 'premium',
    features: ['Raw data CSV', 'Interactive charts', 'Shareable links', 'Custom branding'],
    iconName: 'Download',
    sortOrder: 7,
    isActive: true,
  },
];

const DEFAULT_CONVERSION_RULES = DEFAULT_CATALOG.map(({ serviceId, name, description, category, tokenCost, sortOrder }) => ({
  serviceId, name, description, category, tokenCost, sortOrder, isActive: true,
}));

const DEFAULT_EARN_POLICY = {
  _singleton: 'global',
  referralSent: 10, referralAccepted: 5,
  kycVerified: 50, profileCompleted: 25,
  inviteColleague: 20, dataContribution: 15,
  analyticsCompleted: 15, dtxCompleted: 0, appointmentCompleted: 15,
};

async function seedDefaults() {
  try {
    const TokenCatalog = require('../models/TokenCatalog');
    const ConversionRule = require('../models/ConversionRule');
    const TokenEarnPolicy = require('../models/TokenEarnPolicy');

    const [catalogCount, ruleCount] = await Promise.all([
      TokenCatalog.countDocuments(),
      ConversionRule.countDocuments(),
    ]);

    if (catalogCount === 0) {
      await TokenCatalog.insertMany(DEFAULT_CATALOG);
      logger.info(`seedDefaults: inserted ${DEFAULT_CATALOG.length} TokenCatalog items`);
    }

    if (ruleCount === 0) {
      await ConversionRule.insertMany(DEFAULT_CONVERSION_RULES);
      logger.info(`seedDefaults: inserted ${DEFAULT_CONVERSION_RULES.length} ConversionRule items`);
    }

    // Upsert the singleton earn policy
    await TokenEarnPolicy.findOneAndUpdate(
      { _singleton: 'global' },
      { $setOnInsert: DEFAULT_EARN_POLICY },
      { upsert: true, new: false }
    );
  } catch (err) {
    logger.warn('seedDefaults failed (non-fatal)', { error: err.message });
  }
}

module.exports = { seedDefaults };
