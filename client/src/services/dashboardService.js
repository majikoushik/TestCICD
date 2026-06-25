import { get, post, put } from '../utils/apiUtils';
import { executeGraphQLQuery } from '../utils/graphqlUtils';
import { 
  generateUsers, 
  generatePatients, 
  generateReferrals, 
  generateAnalytics, 
  generateTokenTransactions,
  mockProviderPerformance,
  mockReferralConversionData,
  mockTokenEconomyData,
  mockAIAnalyticsData,
  mockScheduledReports,
  mockTokenEconomyTrends,
  mockAIAnalytics,
  careQualityIndex,
  referralConversionRate,
  analyticsEngagementGrowth,
  tokenEstimatedValue
} from './mockData';

/**
 * Service for handling dashboard operations
 */
const dashboardService = {
  /**
   * Get dashboard data including patients, referrals, analytics, and recent activity
   * @returns {Promise<Object>} Dashboard data
   */
  getDashboardData: async () => {
    try {
      // Check if we should use mock data
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Use mock data from mockData.js
        const patients = generatePatients(25);
        const users = generateUsers(15);
        const referrals = generateReferrals(20, patients, users);
        const analytics = generateAnalytics(5, users);
        
        // Create dashboard data from mock data
        const mockDashboardData = {
          patients: {
            total: patients.length,
            highRisk: patients.filter(patient => patient.riskLevel === 'high').length,
            careQualityIndex: careQualityIndex
          },
          referrals: {
            pending: referrals.filter(ref => ref.status === 'pending').length,
            completed: referrals.filter(ref => ref.status === 'completed').length,
            conversionRate: referralConversionRate
          },
          analytics: {
            recent: analytics.slice(0, 3),
            engagementGrowth: analyticsEngagementGrowth
          },
          tokens: {
            balance: 175,
            estimatedValue: tokenEstimatedValue
          },
          recentActivity: generateTokenTransactions(4, users).map(tx => ({
            id: tx.id,
            type: tx.type === 'earned' ? 'token' : tx.type === 'referral_completed' ? 'referral' : 'patient',
            description: tx.description,
            timestamp: tx.timestamp,
            status: tx.status
          }))
        };

        // Return mock data with a delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        return mockDashboardData;
      }

      // Use GraphQL to fetch dashboard data
      const query = `
        query GetDashboardData {
          dashboardData {
            patients {
              total
              highRisk
            }
            referrals {
              pending
              completed
            }
            analytics {
              recent {
                id
                title
                type
                summary
                createdAt
              }
            }
            recentActivity {
              id
              type
              description
              timestamp
              status
            }
          }
        }
      `;
      
      const response = await executeGraphQLQuery(query);
      return {
        success: true,
        data: response.data.dashboardData
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  },

  /**
   * Get patient statistics
   * @returns {Promise<Object>} Patient statistics
   */
  getPatientStatistics: async () => {
    try {
      // Check if we should use mock data
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Generate mock patients using the function from mockData.js
        const patients = generatePatients(125);
        
        // Calculate statistics from the generated patients
        const highRisk = patients.filter(p => p.riskLevel === 'high').length;
        const mediumRisk = patients.filter(p => p.riskLevel === 'medium').length;
        const lowRisk = patients.filter(p => p.riskLevel === 'low').length;
        
        // Calculate patients by age group
        const byAge = [
          { age: '0-18', count: Math.floor(patients.length * 0.12) },
          { age: '19-35', count: Math.floor(patients.length * 0.22) },
          { age: '36-50', count: Math.floor(patients.length * 0.28) },
          { age: '51-65', count: Math.floor(patients.length * 0.24) },
          { age: '65+', count: Math.floor(patients.length * 0.14) }
        ];
        
        const mockPatientStats = {
          total: patients.length,
          newThisMonth: Math.floor(patients.length * 0.1),
          highRisk,
          byRiskLevel: {
            low: lowRisk,
            medium: mediumRisk,
            high: highRisk
          },
          byAge
        };

        // Return mock data with a delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
          success: true,
          data: mockPatientStats
        };
      }

      // Use GraphQL to fetch patient statistics
      const query = `
        query GetPatientStatistics {
          patientStatistics {
            total
            newThisMonth
            highRisk
            byRiskLevel {
              low
              medium
              high
            }
            byAge {
              age
              count
            }
          }
        }
      `;
      
      const response = await executeGraphQLQuery(query);
      return {
        success: true,
        data: response.data.patientStatistics
      };
    } catch (error) {
      console.error('Error fetching patient statistics:', error);
      throw error;
    }
  },

  /**
   * Get referral statistics
   * @returns {Promise<Object>} Referral statistics
   */
  getReferralStatistics: async () => {
    try {
      // Check if we should use mock data
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Use mockReferralConversionData from mockData.js
        const conversionData = mockReferralConversionData;
        
        // Calculate totals from the conversion data
        const total = conversionData.reduce((sum, month) => sum + month.sent, 0);
        const completed = conversionData.reduce((sum, month) => sum + month.completed, 0);
        const pending = conversionData.reduce((sum, month) => sum + (month.accepted - month.completed), 0);
        const rejected = conversionData.reduce((sum, month) => sum + (month.sent - month.accepted), 0);
        
        // Create mock referral statistics using the data
        const mockReferralStats = {
          total,
          pending,
          completed,
          rejected,
          averageCompletionTime: 36, // hours
          bySpecialty: [
            { specialty: 'Cardiology', count: Math.floor(total * 0.26) },
            { specialty: 'Neurology', count: Math.floor(total * 0.21) },
            { specialty: 'Orthopedics', count: Math.floor(total * 0.18) },
            { specialty: 'Oncology', count: Math.floor(total * 0.14) },
            { specialty: 'Other', count: Math.floor(total * 0.21) }
          ]
        };

        // Return mock data with a delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
          success: true,
          data: mockReferralStats
        };
      }

      // Use GraphQL to fetch referral statistics
      const query = `
        query GetReferralStatistics {
          referralStatistics {
            total
            pending
            completed
            rejected
            averageCompletionTime
            bySpecialty {
              specialty
              count
            }
          }
        }
      `;
      
      const response = await executeGraphQLQuery(query);
      return {
        success: true,
        data: response.data.referralStatistics
      };
    } catch (error) {
      console.error('Error fetching referral statistics:', error);
      throw error;
    }
  },

  /**
   * Get recent activities
   * @param {number} limit - Number of activities to return
   * @returns {Promise<Array>} Recent activities
   */
  getRecentActivities: async (limit = 10) => {
    try {
      // Check if we should use mock data
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Generate users and patients for reference
        const users = generateUsers(10);
        const patients = generatePatients(15);
        
        // Generate token transactions and map them to activities
        const tokenActivities = generateTokenTransactions(4, users).map(tx => ({
          id: `activity-token-${tx.id}`,
          type: 'token',
          description: tx.description,
          timestamp: tx.timestamp,
          status: tx.status
        }));
        
        // Generate referral activities
        const referralActivities = generateReferrals(2, patients, users).map((ref, index) => ({
          id: `activity-referral-${index}`,
          type: 'referral',
          description: `${index === 0 ? 'New referral created for' : 'Referral completed for'} ${ref.patientName}`,
          timestamp: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
          status: index === 0 ? 'pending' : 'completed'
        }));
        
        // Generate patient activities
        const patientActivities = patients.slice(0, 2).map((patient, index) => ({
          id: `activity-patient-${index}`,
          type: 'patient',
          description: `${index === 0 ? 'Patient record updated:' : 'New patient registered:'} ${patient.firstName} ${patient.lastName}`,
          timestamp: new Date(Date.now() - (index + 3) * 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed'
        }));
        
        // Combine all activities
        const mockActivities = [
          ...tokenActivities,
          ...referralActivities,
          ...patientActivities,
          {
            id: 'activity-analytics-1',
            type: 'analytics',
            description: 'Risk analysis report generated',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'completed'
          },
          {
            id: 'activity-analytics-2',
            type: 'analytics',
            description: 'Patient risk assessment updated',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'completed'
          }
        ];
        
        // Sort activities by timestamp (newest first)
        mockActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Return limited number of activities
        const limitedActivities = mockActivities.slice(0, limit);

        // Return mock data with a delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 200));
        return {
          success: true,
          data: limitedActivities
        };
      }

      // Make API call using apiUtils
      const response = await get(`/dashboard/activities?limit=${limit}`);
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      throw error;
    }
  },

  /**
   * Get recent analytics reports
   * @param {number} limit - Number of reports to return
   * @returns {Promise<Array>} Recent analytics reports
   */
  getRecentAnalytics: async (limit = 5) => {
    try {
      // Check if we should use mock data
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Use mockAIAnalyticsData from mockData.js
        const aiAnalyticsData = mockAIAnalyticsData;
        
        // Generate users for reference
        const users = generateUsers(5);
        
        // Generate analytics reports using the generateAnalytics function from mockData.js
        const mockReports = generateAnalytics(5, users);

        // Return limited number of reports
        const limitedReports = mockReports.slice(0, limit);

        // Return mock data with a delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
          success: true,
          data: limitedReports
        };
      }

      // Make API call using apiUtils
      const response = await get(`/dashboard/analytics?limit=${limit}`);
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error fetching recent analytics reports:', error);
      throw error;
    }
  },


  /**
   * Get provider performance metrics
   * @returns {Promise<Object>} Provider performance data
   */
  getProviderPerformance: async () => {
    try {
      // Check if we should use mock data
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Use mock provider performance data
        const mockData = mockProviderPerformance;

        // Return mock data with a delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
          success: true,
          data: mockData
        };
      }

      // Use GraphQL to fetch provider performance
      const query = `
        query GetProviderPerformance {
          providerPerformance {
            providers {
              id
              name
              referralCount
              acceptanceRate
              completionRate
              averageResponseTime
            }
            topPerformers {
              id
              name
              referralCount
              acceptanceRate
              completionRate
              averageResponseTime
            }
            averageAcceptanceRate
            averageCompletionTime
          }
        }
      `;
      
      const response = await executeGraphQLQuery(query);
      return {
        success: true,
        data: response.data.providerPerformance
      };
    } catch (error) {
      console.error('Error fetching provider performance:', error);
      throw error;
    }
  },

  /**
   * Get token economy statistics
   * @param {string} period - Time period for token trends (3months, 6months, 1year)
   * @returns {Promise<Object>} Token economy data
   */
  getTokenEconomyStats: async (period = '6months') => {
    try {
      // Check if we should use mock data
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Use mock token economy data
        const mockData = mockTokenEconomyTrends(period);

        // Return mock data with a delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
          success: true,
          data: mockData
        };
      }

      // Use GraphQL to fetch token economy stats
      const query = `
        query GetTokenEconomyStats($period: String) {
          tokenEconomyStats(period: $period) {
            totalIssued
            totalRedeemed
            inCirculation
            trends {
              periods
              issued
              redeemed
              circulation
            }
          }
        }
      `;
      
      const variables = { period };
      const response = await executeGraphQLQuery(query, variables);
      return {
        success: true,
        data: response.data.tokenEconomyStats
      };
    } catch (error) {
      console.error('Error fetching token economy stats:', error);
      throw error;
    }
  },

  /**
   * Get AI analytics statistics
   * @returns {Promise<Object>} AI analytics data
   */
  getAIAnalyticsStats: async () => {
    try {
      // Check if we should use mock data
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Use mock AI analytics data
        const mockData = mockAIAnalytics;

        // Return mock data with a delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
          success: true,
          data: mockData
        };
      }

      // Use GraphQL to fetch AI analytics stats
      const query = `
        query GetAIAnalyticsStats {
          aiAnalyticsStats {
            usageByFeature {
              feature
              count
              periods
              usage
            }
            accuracyMetrics {
              riskAssessment
              summaryGeneration
              recommendations
              overall
            }
            feedbackMetrics {
              falsePositives
              falseNegatives
              improvementRate
            }
          }
        }
      `;
      
      const response = await executeGraphQLQuery(query);
      return {
        success: true,
        data: response.data.aiAnalyticsStats
      };
    } catch (error) {
      console.error('Error fetching AI analytics stats:', error);
      throw error;
    }
  }
};

export default dashboardService;
