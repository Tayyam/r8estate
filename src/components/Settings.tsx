import React, { useState } from 'react';
import { Settings as SettingsIcon, Users, Building2, Tag, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import UserManagement from './Settings/UserManagement';
import Companies from './Settings/Companies';
import Categories from './Settings/Categories';

interface SettingsProps {
  onNavigateToProfile?: (companyId: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ onNavigateToProfile }) => {
  const { currentUser } = useAuth();
  const { translations } = useLanguage();
  const [activeTab, setActiveTab] = useState('users');

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
            Access Denied
          </h2>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'users',
      name: 'User Management',
      icon: Users,
      component: UserManagement
    },
    {
      id: 'companies',
      name: 'Companies',
      icon: Building2,
      component: (props: any) => <Companies {...props} onNavigateToProfile={onNavigateToProfile} />
    },
    {
      id: 'categories',
      name: 'Categories',
      icon: Tag,
      component: Categories
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || UserManagement;

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
              Admin Settings
            </h1>
            <p className="text-base sm:text-lg text-gray-600">
              Manage users and system configuration
            </p>
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
          <ActiveComponent />
        </div>
      </section>
    </div>
  );
};

export default Settings;