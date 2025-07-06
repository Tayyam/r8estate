import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Company } from '../../types/company';
import { Shield, Zap, AlertCircle, Check, Crown, Star, Calendar } from 'lucide-react';

interface PlanTabProps {
  company: Company;
}

const PlanTab: React.FC<PlanTabProps> = ({ company }) => {
  const { translations } = useLanguage();
  
  // Placeholder - in a real implementation, plan information would come from a subscription system
  const currentPlan = {
    name: 'Free',
    price: '£0',
    period: '',
    renewalDate: new Date(),
    features: [
      translations?.basicCompanyProfile || 'Basic company profile',
      translations?.viewReviews || 'View reviews',
      translations?.basicStatistics || 'Basic statistics',
      translations?.emailSupport || 'Email support'
    ],
    isActive: true
  };
  
  // Upgrade plan features
  const upgradePlanFeatures = [
    translations?.allFreePlanFeatures || 'All free plan features',
    translations?.replyToReviews || 'Reply to reviews',
    translations?.advancedAnalytics || 'Advanced analytics',
    translations?.detailedInsights || 'Detailed insights',
    translations?.prioritySupport || 'Priority support',
    translations?.customBranding || 'Custom branding',
    translations?.multiUserManagement || 'Multi-user management',
    translations?.monthlyReports || 'Monthly reports'
  ];

  return (
    <div className="space-y-6">
      {/* Current Plan Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {translations?.currentPlan || 'Current Plan'}
          </h2>
          <p className="text-gray-600">
            {translations?.yourSubscriptionDetails || 'Your subscription details and benefits'}
          </p>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            {/* Plan Details */}
            <div className="mb-6 md:mb-0">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mb-2">
                <Shield className="h-4 w-4 mr-1" />
                {currentPlan.name} {translations?.plan || 'Plan'}
              </div>
              
              <div className="flex items-baseline mb-4">
                <span className="text-3xl font-bold text-gray-900">{currentPlan.price}</span>
                {currentPlan.period && (
                  <span className="ml-1 text-gray-500">{currentPlan.period}</span>
                )}
              </div>
              
              {currentPlan.isActive ? (
                <div className="flex items-center text-green-600">
                  <Check className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">
                    {translations?.activePlan || 'Active Plan'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">
                    {translations?.inactivePlan || 'Inactive Plan'}
                  </span>
                </div>
              )}
            </div>
            
            {/* Plan Features */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                {translations?.includedFeatures || 'Included Features'}
              </h3>
              <ul className="space-y-2">
                {currentPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Upgrade Plan Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg overflow-hidden text-white">
        <div className="p-6 flex items-start justify-between">
          <div>
            <div className="flex items-center mb-2">
              <Crown className="h-6 w-6 mr-2 text-yellow-400" />
              <h2 className="text-xl font-bold">
                {translations?.upgradeToProPlan || 'Upgrade to Professional Plan'}
              </h2>
            </div>
            <p className="text-blue-100 mb-4">
              {translations?.unlockPremiumFeatures || 'Unlock premium features and take your company profile to the next level'}
            </p>
            
            <div className="flex items-baseline mb-4">
              <span className="text-3xl font-bold">£299</span>
              <span className="ml-1 text-blue-200">
                / {translations?.monthlyPeriod || 'monthly'}
              </span>
            </div>
            
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mb-6">
              {upgradePlanFeatures.map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-blue-100">
                  <Check className="h-4 w-4 text-yellow-400 mr-2 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            
            <button className="inline-flex items-center px-4 py-2 bg-white text-blue-700 font-medium rounded-lg hover:bg-blue-50 transition-colors duration-200 shadow">
              <Zap className="h-4 w-4 mr-2" />
              {translations?.upgradeNow || 'Upgrade Now'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Billing History - Coming Soon */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Calendar className="h-8 w-8 text-gray-500" />
        </div>
        <h3 className="text-xl font-medium text-gray-900 mb-2">
          {translations?.billingHistory || 'Billing History'}
        </h3>
        <p className="text-gray-500 mb-4">
          {translations?.billingHistoryComingSoon || 'Billing history and invoice management coming soon'}
        </p>
      </div>
    </div>
  );
};

export default PlanTab;