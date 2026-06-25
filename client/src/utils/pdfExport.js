import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

/**
 * Utility for generating PDF reports from analytics data
 */
export const generatePDF = (reportType, data, options = {}) => {
  const doc = new jsPDF();
  const currentDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  const title = options.title || `${reportType.replace('_', ' ').toUpperCase()} REPORT`;
  
  // Add header
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${currentDate}`, 14, 30);
  
  if (options.subtitle) {
    doc.text(options.subtitle, 14, 38);
  }
  
  doc.line(14, 40, 196, 40);
  
  // Add content based on report type
  switch (reportType) {
    case 'provider_performance':
      generateProviderPerformanceReport(doc, data);
      break;
    case 'referral_conversion':
      generateReferralConversionReport(doc, data);
      break;
    case 'token_economy':
      generateTokenEconomyReport(doc, data);
      break;
    case 'ai_analytics':
      generateAIAnalyticsReport(doc, data);
      break;
    case 'comprehensive':
      generateComprehensiveReport(doc, data);
      break;
    default:
      doc.setFontSize(12);
      doc.text('No data available for the selected report type.', 14, 50);
  }
  
  // Add footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(
      `VibeHealth Analytics | Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  return doc;
};

/**
 * Generate Provider Performance Report
 */
const generateProviderPerformanceReport = (doc, data) => {
  doc.setFontSize(14);
  doc.text('Provider Performance Summary', 14, 50);
  
  // Summary statistics
  doc.setFontSize(12);
  doc.text('Key Metrics:', 14, 60);
  
  const totalReferrals = data.reduce((sum, provider) => sum + provider.referralsCount, 0);
  const totalAccepted = data.reduce((sum, provider) => sum + provider.acceptedCount, 0);
  const avgAcceptanceRate = (totalAccepted / totalReferrals * 100).toFixed(1);
  
  doc.setFontSize(11);
  doc.text(`Total Referrals: ${totalReferrals}`, 20, 70);
  doc.text(`Total Accepted: ${totalAccepted}`, 20, 78);
  doc.text(`Average Acceptance Rate: ${avgAcceptanceRate}%`, 20, 86);
  
  // Provider table
  doc.setFontSize(14);
  doc.text('Provider Details', 14, 100);
  
  const tableData = data.map(provider => [
    provider.name,
    provider.referralsCount,
    provider.acceptedCount,
    `${(provider.acceptanceRate * 100).toFixed(1)}%`,
    provider.avgResponseTime
  ]);
  
  doc.autoTable({
    startY: 110,
    head: [['Provider Name', 'Referrals', 'Accepted', 'Acceptance Rate', 'Avg Response Time (hrs)']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [66, 139, 202] }
  });
};

/**
 * Generate Referral Conversion Report
 */
const generateReferralConversionReport = (doc, data) => {
  doc.setFontSize(14);
  doc.text('Referral Conversion Summary', 14, 50);
  
  // Summary statistics
  doc.setFontSize(12);
  doc.text('Conversion Metrics:', 14, 60);
  
  // Calculate totals
  const lastMonth = data[data.length - 1];
  
  doc.setFontSize(11);
  doc.text(`Last Month Referrals Sent: ${lastMonth.sent}`, 20, 70);
  doc.text(`Last Month Referrals Accepted: ${lastMonth.accepted}`, 20, 78);
  doc.text(`Last Month Referrals Completed: ${lastMonth.completed}`, 20, 86);
  doc.text(`Acceptance Rate: ${(lastMonth.accepted / lastMonth.sent * 100).toFixed(1)}%`, 20, 94);
  doc.text(`Completion Rate: ${(lastMonth.completed / lastMonth.accepted * 100).toFixed(1)}%`, 20, 102);
  doc.text(`Overall Conversion Rate: ${(lastMonth.completed / lastMonth.sent * 100).toFixed(1)}%`, 20, 110);
  
  // Monthly data table
  doc.setFontSize(14);
  doc.text('Monthly Conversion Data', 14, 124);
  
  const tableData = data.map(month => [
    month.month,
    month.sent,
    month.accepted,
    month.completed,
    `${(month.accepted / month.sent * 100).toFixed(1)}%`,
    `${(month.completed / month.accepted * 100).toFixed(1)}%`
  ]);
  
  doc.autoTable({
    startY: 134,
    head: [['Month', 'Sent', 'Accepted', 'Completed', 'Acceptance Rate', 'Completion Rate']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [66, 139, 202] }
  });
};

/**
 * Generate Token Economy Report
 */
const generateTokenEconomyReport = (doc, data) => {
  doc.setFontSize(14);
  doc.text('Token Economy Trends', 14, 50);
  
  // Summary statistics
  doc.setFontSize(12);
  doc.text('Token Metrics:', 14, 60);
  
  const totalIssued = data.reduce((sum, month) => sum + month.issued, 0);
  const totalRedeemed = data.reduce((sum, month) => sum + month.redeemed, 0);
  const currentCirculation = data[data.length - 1].circulation;
  
  doc.setFontSize(11);
  doc.text(`Total Tokens Issued: ${totalIssued.toLocaleString()}`, 20, 70);
  doc.text(`Total Tokens Redeemed: ${totalRedeemed.toLocaleString()}`, 20, 78);
  doc.text(`Current Tokens in Circulation: ${currentCirculation.toLocaleString()}`, 20, 86);
  doc.text(`Redemption Rate: ${(totalRedeemed / totalIssued * 100).toFixed(1)}%`, 20, 94);
  
  // Monthly data table
  doc.setFontSize(14);
  doc.text('Monthly Token Data', 14, 108);
  
  const tableData = data.map(month => [
    month.month,
    month.issued.toLocaleString(),
    month.redeemed.toLocaleString(),
    month.circulation.toLocaleString()
  ]);
  
  doc.autoTable({
    startY: 118,
    head: [['Month', 'Tokens Issued', 'Tokens Redeemed', 'Tokens in Circulation']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [66, 139, 202] }
  });
};

/**
 * Generate AI Analytics Report
 */
const generateAIAnalyticsReport = (doc, data) => {
  doc.setFontSize(14);
  doc.text('AI Analytics Usage & Accuracy', 14, 50);
  
  // Accuracy metrics
  doc.setFontSize(12);
  doc.text('Accuracy Metrics:', 14, 60);
  
  doc.setFontSize(11);
  doc.text(`Risk Assessment Accuracy: ${(data.accuracy.riskAssessment * 100).toFixed(1)}%`, 20, 70);
  doc.text(`Summary Generation Accuracy: ${(data.accuracy.summaryGeneration * 100).toFixed(1)}%`, 20, 78);
  doc.text(`Recommendation Accuracy: ${(data.accuracy.recommendationEngine * 100).toFixed(1)}%`, 20, 86);
  doc.text(`False Positives: ${data.falsePositives}`, 20, 94);
  doc.text(`False Negatives: ${data.falseNegatives}`, 20, 102);
  doc.text(`AI Improvement Rate: ${(data.improvementRate * 100).toFixed(1)}%`, 20, 110);
  
  // Usage data table
  doc.setFontSize(14);
  doc.text('Monthly Usage Data', 14, 124);
  
  const tableData = data.usage.map(month => [
    month.month,
    month.riskAssessment,
    month.summaryGeneration,
    month.recommendationEngine,
    month.riskAssessment + month.summaryGeneration + month.recommendationEngine
  ]);
  
  doc.autoTable({
    startY: 134,
    head: [['Month', 'Risk Assessment', 'Summary Generation', 'Recommendations', 'Total Usage']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [66, 139, 202] }
  });
};

/**
 * Generate Comprehensive Report (combines all report types)
 */
const generateComprehensiveReport = (doc, data) => {
  // Provider Performance
  if (data.providerPerformance && data.providerPerformance.length > 0) {
    doc.setFontSize(16);
    doc.text('1. PROVIDER PERFORMANCE', 14, 50);
    generateProviderPerformanceReport(doc, data.providerPerformance);
    doc.addPage();
  }
  
  // Referral Conversion
  if (data.referralConversion && data.referralConversion.length > 0) {
    doc.setFontSize(16);
    doc.text('2. REFERRAL CONVERSION', 14, 50);
    generateReferralConversionReport(doc, data.referralConversion);
    doc.addPage();
  }
  
  // Token Economy
  if (data.tokenEconomy && data.tokenEconomy.length > 0) {
    doc.setFontSize(16);
    doc.text('3. TOKEN ECONOMY', 14, 50);
    generateTokenEconomyReport(doc, data.tokenEconomy);
    doc.addPage();
  }
  
  // AI Analytics
  if (data.aiAnalytics) {
    doc.setFontSize(16);
    doc.text('4. AI ANALYTICS', 14, 50);
    generateAIAnalyticsReport(doc, data.aiAnalytics);
  }
};

export default generatePDF;
