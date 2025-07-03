import React, { useState } from 'react';
import { Settings as SettingsIcon, Users, Building2, Tag, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

// Import old components for backward compatibility
import UserManagement from './UserManagement';
import Companies from './Companies';
import Categories from './Categories';

// Import new table-based components
import UserManagementWithTable from './UserManagementWithTable';
import CompaniesWithTable from './CompaniesWithTable';
import CategoriesWithTable from './CategoriesWithTable';

interface SettingsProps {
  onNavigateToProfile?: (companyId: string, companyName?: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ onNavigateToProfile }) => {
  const { currentUser } = useAuth();
  const { translations } = useLanguage();
  const [activeTab, setActiveTab] = useState('users');
  const [useNewTables, setUseNewTables] = useState(true); // Controls which set of components to use

  // Check if current user is admin
  const isAdmin = currentUser?.role === 'admin';

  // Don't render if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            {translations?.accessDenied || 'Access Denied'}
          </h2>
          <p className="text-gray-600">
            {translations?.noPermissionAccess || 'You don\'t have permission to access this page.'}
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'users',
      name: translations?.userManagement || 'User Management',
      icon: Users,
      oldComponent: UserManagement,
      newComponent: UserManagementWithTable
    },
    {
      id: 'companies',
      name: translations?.companies || 'Companies',
      icon: Building2,
      oldComponent: (props: any) => <Companies {...props} onNavigateToProfile={onNavigateToProfile} />,
      newComponent: (props: any) => <CompaniesWithTable {...props} onNavigateToProfile={onNavigateToProfile} />
    },
    {
      id: 'categories',
      name: translations?.categories || 'Categories',
      icon: Tag,
      oldComponent: Categories,
      newComponent: CategoriesWithTable
    }
  ];

  // Get the appropriate component based on the active tab and table mode
  const getActiveComponent = () => {
    const tabData = tabs.find(tab => tab.id === activeTab);
    if (!tabData) {
      return <div>Tab not found</div>;
    }
    
    const Component = useNewTables ? tabData.newComponent : tabData.oldComponent;
    return <Component />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="text-center max-w-3xl mx-auto">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-lg" style={{ backgroundColor: '#194866' }}>
              <SettingsIcon className="h-8 w-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4" style={{ color: '#194866' }}>
              {translations?.adminSettings || 'Admin Settings'}
            </h1>
            <p className="text-base sm:text-lg text-gray-600">
              {translations?.manageUsersSystem || 'Manage users and system configuration'}
            </p>

            {/* Table Mode Toggle */}
            <div className="mt-4 flex justify-center">
              <div className="bg-gray-100 p-1 rounded-lg">
                <button
                  className={`px-4 py-2 text-sm rounded-md ${useNewTables ? 'bg-blue-600 text-white' : 'text-gray-700'}`}
                  onClick={() => setUseNewTables(true)}
                >
                  {translations?.newTableView || 'New Table View'}
                </button>
                <button
                  className={`px-4 py-2 text-sm rounded-md ${!useNewTables ? 'bg-blue-600 text-white' : 'text-gray-700'}`}
                  onClick={() => setUseNewTables(false)}
                >
                  {translations?.classicView || 'Classic View'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 rtl:space-x-reverse px-6 py-4 font-medium transition-all duration-200 border-b-2 whitespace-nowrap ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-6 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {getActiveComponent()}
        </div>
      </section>
    </div>
  );
};

export default Settings;