import React from 'react';
import { Building2, Eye, MessageSquare, LayoutGrid } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Property } from '../../types/property';
import { Review } from '../../types/property';
import { Category } from '../../types/company';

interface CompanyTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  properties: Property[];
  reviews: Review[];
  company: {
    categoryId: string;
  };
  categories: Category[];
  userCanReview: boolean;
}

const CompanyTabs: React.FC<CompanyTabsProps> = ({
  activeTab,
  setActiveTab,
  properties,
  reviews,
  company,
  categories,
  userCanReview
}) => {
  const { translations } = useLanguage();

  // Check if company is a Real Estate Developing Company
  const isRealEstateDeveloper = categories.some(
    category => category.id === company.categoryId && category.name === "Real Estate Developing Companies"
  );

  // Create tabs array
  const tabs = [
    { id: 'overview', name: translations?.overview || 'Overview', icon: Building2 },
    { id: 'reviews', name: translations?.reviewsTab || 'Reviews', icon: MessageSquare },
  ];

  // Add projects tab if company is a real estate developer
  if (isRealEstateDeveloper) {
    tabs.splice(1, 0, {
      id: 'projects',
      name: translations?.projectsTab || 'Projects',
      icon: LayoutGrid
    });
  }

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