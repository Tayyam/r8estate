import React from 'react';
import { Building2, Eye, MessageSquare, Star } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Property } from '../../types/property';
import { Review } from '../../types/property';

interface CompanyTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  properties: Property[];
  reviews: Review[];
  userCanReview: boolean;
  hasUserReviewed: boolean;
}

const CompanyTabs: React.FC<CompanyTabsProps> = ({
  activeTab,
  setActiveTab,
  properties,
  reviews,
  userCanReview,
  hasUserReviewed
}) => {
  const { translations } = useLanguage();

  // Always include "Write a Review" tab first, followed by the base tabs
  const tabs = [
    { id: 'write-review', name: hasUserReviewed ? (translations?.editReview || 'Edit Review') : (translations?.writeReview || 'Write a Review'), icon: Star },
    { id: 'overview', name: translations?.overview || 'Overview', icon: Building2 },
    { id: 'properties', name: translations?.propertiesTab || 'Properties', icon: Eye },
    { id: 'reviews', name: translations?.reviewsTab || 'Reviews', icon: MessageSquare }
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 rtl:space-x-reverse overflow-x-auto">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 rtl:space-x-reverse px-4 py-4 font-medium transition-all duration-200 border-b-2 ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <IconComponent className="h-5 w-5" />
                <span>{tab.name}</span>
                {tab.id === 'properties' && properties.length > 0 && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                    {properties.length}
                  </span>
                )}
                {tab.id === 'reviews' && reviews.length > 0 && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                    {reviews.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CompanyTabs;