const dashboardController = require('./controllers/dashboardController');

// Helper function to convert controller response to resolver format
const controllerToResolver = async (controllerFn, req) => {
  return new Promise((resolve, reject) => {
    const res = {
      status: () => res,
      json: (data) => resolve(data),
    };
    
    controllerFn(req, res).catch(reject);
  });
};

// Mock data for new admin dashboard features
const mockProviderPerformance = () => ({
  providers: [
    { id: 'p1', name: 'Dr. Sarah Johnson', referralCount: 45, acceptanceRate: 0.92, completionRate: 0.87, averageResponseTime: 8 },
    { id: 'p2', name: 'Dr. Robert Chen', referralCount: 38, acceptanceRate: 0.85, completionRate: 0.79, averageResponseTime: 12 },
    { id: 'p3', name: 'Dr. Emily Rodriguez', referralCount: 52, acceptanceRate: 0.88, completionRate: 0.82, averageResponseTime: 6 },
    { id: 'p4', name: 'Dr. Michael Wong', referralCount: 29, acceptanceRate: 0.79, completionRate: 0.72, averageResponseTime: 18 },
    { id: 'p5', name: 'Dr. Lisa Patel', referralCount: 41, acceptanceRate: 0.90, completionRate: 0.85, averageResponseTime: 10 }
  ],
  topPerformers: [
    { id: 'p3', name: 'Dr. Emily Rodriguez', referralCount: 52, acceptanceRate: 0.88, completionRate: 0.82, averageResponseTime: 6 },
    { id: 'p1', name: 'Dr. Sarah Johnson', referralCount: 45, acceptanceRate: 0.92, completionRate: 0.87, averageResponseTime: 8 },
    { id: 'p5', name: 'Dr. Lisa Patel', referralCount: 41, acceptanceRate: 0.90, completionRate: 0.85, averageResponseTime: 10 }
  ],
  averageAcceptanceRate: 0.87,
  averageCompletionTime: 24
});

const mockTokenEconomyStats = (period = '6months') => {
  // Generate different data based on period
  let periods, issued, redeemed, circulation;
  
  switch(period) {
    case '3months':
      periods = ['May', 'Jun', 'Jul', 'Aug'];
      issued = [1200, 1450, 1320, 1580];
      redeemed = [950, 1100, 1050, 1200];
      circulation = [250, 600, 870, 1250];
      break;
    case '1year':
      periods = ['Aug 2024', 'Oct 2024', 'Dec 2024', 'Feb 2025', 'Apr 2025', 'Jun 2025', 'Aug 2025'];
      issued = [800, 1100, 1400, 1650, 1900, 2200, 2500];
      redeemed = [600, 850, 1100, 1300, 1500, 1750, 2000];
      circulation = [200, 450, 750, 1100, 1500, 1950, 2450];
      break;
    default: // 6months
      periods = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
      issued = [1050, 1150, 1250, 1450, 1550, 1650];
      redeemed = [800, 900, 1000, 1150, 1200, 1300];
      circulation = [250, 500, 750, 1050, 1400, 1750];
  }
  
  return {
    totalIssued: issued.reduce((sum, val) => sum + val, 0),
    totalRedeemed: redeemed.reduce((sum, val) => sum + val, 0),
    inCirculation: circulation[circulation.length - 1],
    trends: {
      periods,
      issued,
      redeemed,
      circulation
    }
  };
};

const mockAIAnalyticsStats = () => ({
  usageByFeature: [
    {
      feature: 'Risk Assessment',
      count: 1250,
      periods: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
      usage: [180, 195, 210, 225, 215, 225]
    },
    {
      feature: 'Patient Summaries',
      count: 980,
      periods: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
      usage: [140, 155, 160, 170, 175, 180]
    },
    {
      feature: 'Treatment Recommendations',
      count: 750,
      periods: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
      usage: [110, 115, 120, 130, 135, 140]
    },
    {
      feature: 'Referral Analysis',
      count: 620,
      periods: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
      usage: [90, 95, 100, 105, 110, 120]
    }
  ],
  accuracyMetrics: {
    riskAssessment: 0.92,
    summaryGeneration: 0.89,
    recommendations: 0.85,
    overall: 0.88
  },
  feedbackMetrics: {
    falsePositives: 68,
    falseNegatives: 42,
    improvementRate: 0.12
  }
});

const resolvers = {
  dashboardData: async (args, req) => {
    return controllerToResolver(dashboardController.getDashboardData, req);
  },
  
  patientStatistics: async (args, req) => {
    return controllerToResolver(dashboardController.getPatientStatistics, req);
  },
  
  referralStatistics: async (args, req) => {
    return controllerToResolver(dashboardController.getReferralStatistics, req);
  },
  
  recentActivities: async ({ limit }, req) => {
    req.query = { limit };
    return controllerToResolver(dashboardController.getRecentActivities, req);
  },
  
  recentAnalytics: async ({ limit }, req) => {
    req.query = { limit };
    return controllerToResolver(dashboardController.getRecentAnalytics, req);
  },
  
  // New resolvers for admin dashboard
  providerPerformance: async () => {
    return mockProviderPerformance();
  },
  
  tokenEconomyStats: async ({ period }) => {
    return mockTokenEconomyStats(period);
  },
  
  aiAnalyticsStats: async () => {
    return mockAIAnalyticsStats();
  }
};

module.exports = resolvers;
