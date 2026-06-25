const { buildSchema } = require('graphql');

const schema = buildSchema(`
  type PatientStats {
    total: Int
    newThisMonth: Int
    highRisk: Int
    byRiskLevel: RiskLevelStats
    byAge: [AgeGroupStats]
  }

  type RiskLevelStats {
    low: Int
    medium: Int
    high: Int
  }

  type AgeGroupStats {
    age: String
    count: Int
  }

  type ReferralStats {
    total: Int
    pending: Int
    completed: Int
    rejected: Int
    averageCompletionTime: Int
    bySpecialty: [SpecialtyStats]
  }

  type SpecialtyStats {
    specialty: String
    count: Int
  }

  type Activity {
    id: ID
    type: String
    description: String
    timestamp: String
    status: String
  }

  type AnalyticsReport {
    id: ID
    title: String
    type: String
    summary: String
    createdAt: String
    data: String
  }

  type DashboardData {
    patients: PatientSummary
    referrals: ReferralSummary
    analytics: AnalyticsSummary
    recentActivity: [Activity]
  }

  type PatientSummary {
    total: Int
    highRisk: Int
  }

  type ReferralSummary {
    pending: Int
    completed: Int
  }

  type AnalyticsSummary {
    recent: [AnalyticsReport]
  }

  # Provider Performance Types
  type ProviderPerformance {
    providers: [ProviderStats]
    topPerformers: [ProviderStats]
    averageAcceptanceRate: Float
    averageCompletionTime: Int
  }

  type ProviderStats {
    id: ID
    name: String
    referralCount: Int
    acceptanceRate: Float
    completionRate: Float
    averageResponseTime: Int
  }

  # Token Economy Types
  type TokenEconomyStats {
    totalIssued: Int
    totalRedeemed: Int
    inCirculation: Int
    trends: TokenTrends
  }

  type TokenTrends {
    periods: [String]
    issued: [Int]
    redeemed: [Int]
    circulation: [Int]
  }

  # AI Analytics Types
  type AIAnalyticsStats {
    usageByFeature: [FeatureUsage]
    accuracyMetrics: AccuracyMetrics
    feedbackMetrics: FeedbackMetrics
  }

  type FeatureUsage {
    feature: String
    count: Int
    periods: [String]
    usage: [Int]
  }

  type AccuracyMetrics {
    riskAssessment: Float
    summaryGeneration: Float
    recommendations: Float
    overall: Float
  }

  type FeedbackMetrics {
    falsePositives: Int
    falseNegatives: Int
    improvementRate: Float
  }

  # Queries
  type Query {
    dashboardData: DashboardData
    patientStatistics: PatientStats
    referralStatistics: ReferralStats
    recentActivities(limit: Int): [Activity]
    recentAnalytics(limit: Int): [AnalyticsReport]
    
    # New queries for admin dashboard
    providerPerformance: ProviderPerformance
    tokenEconomyStats(period: String): TokenEconomyStats
    aiAnalyticsStats: AIAnalyticsStats
  }
`);

module.exports = schema;
