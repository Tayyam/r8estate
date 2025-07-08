import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart, MessageSquare, Image, Building2, FileText, Briefcase, ExternalLink, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Company } from '../../types/company';
import { getCompanySlug } from '../../utils/urlUtils';

// Import tabs
import OverviewTab from './OverviewTab';
import ReviewsTab from './ReviewsTab';
import GalleryTab from './GalleryTab';
import ProjectsTab from './ProjectsTab';
import ProfileManagementTab from './ProfileManagementTab';
import PlanTab from './PlanTab';

const CompanyDashboard = () => {
  const { currentUser } = useAuth();
  const { translations } = useLanguage();
  const navigate = useNavigate();
  const params = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [company, setCompany] = useState<Company | null>(null);
  const [isDeveloper, setIsDeveloper] = useState(false);

  // Check access and load company data
  useEffect(() => {
    const checkAccessAndLoadData = async () => {
      setLoading(true);

      try {
        // Check if user is logged in and is a company
        if (!currentUser || currentUser.role !== 'company') {
          console.log("Access denied: User not logged in or not a company role", currentUser);
          setError('accessDenied');
          setLoading(false);
          return;
        }

        console.log("Company user authenticated:", { 
          uid: currentUser.uid, 
          email: currentUser.email, 
          companyId: currentUser.companyId 
        });

        // Get company data
        const companyId = currentUser.companyId || currentUser.uid;
        console.log("Attempting to fetch company with ID:", companyId);
        const companyDoc = await getDoc(doc(db, 'companies', companyId));
        
        if (!companyDoc.exists()) {
          console.log("Company not found with primary ID. Searching by email...");
          
          // Attempt to find the company by email as fallback
          const emailQuery = query(
            collection(db, 'companies'),
            where('email', '==', currentUser.email)
          );
          
          console.log("Searching for company with email:", currentUser.email);
          const emailSnapshot = await getDocs(emailQuery);
          
          if (!emailSnapshot.empty) {
            const foundCompanyDoc = emailSnapshot.docs[0];
            const foundCompanyData = {
              id: foundCompanyDoc.id,
              ...foundCompanyDoc.data(),
              createdAt: foundCompanyDoc.data().createdAt?.toDate() || new Date(),
              updatedAt: foundCompanyDoc.data().updatedAt?.toDate() || new Date()
            } as Company;
            
            console.log("Found company by email:", foundCompanyData.name, "ID:", foundCompanyData.id);
            setCompany(foundCompanyData);
            
            // Update user's companyId for future reference
            try {
              console.log("Updating user document with correct companyId:", foundCompanyData.id);
              await updateDoc(doc(db, 'users', currentUser.uid), {
                companyId: foundCompanyData.id,
                updatedAt: new Date()
              });
              console.log("User document updated successfully");
              setLoading(false);
              return;
            } catch (updateError) {
              console.error("Failed to update user with company ID:", updateError);
              // Continue to company not found error
            }
          } else {
            console.log("No company found by email either:", currentUser.email);
          }
          
          console.log("Company not found. Tried ID:", companyId, "and email:", currentUser.email);
          setError('companyNotFound');
          setLoading(false);
          return;
        }

        const companyData = {
          id: companyDoc.id,
          ...companyDoc.data(),
          createdAt: companyDoc.data().createdAt?.toDate() || new Date(),
          updatedAt: companyDoc.data().updatedAt?.toDate() || new Date()
        } as Company;
        
        console.log("Company found successfully:", companyData.name, "ID:", companyData.id);
        setCompany(companyData);

        // Check if company is a developer
        const categoriesQuery = query(
          collection(db, 'categories'),
          where('id', '==', companyData.categoryId)
        );
        
        const categoriesSnapshot = await getDocs(categoriesQuery);
        if (!categoriesSnapshot.empty) {
          const categoryData = categoriesSnapshot.docs[0].data();
          setIsDeveloper(categoryData.name.toLowerCase().includes('developer'));
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading company dashboard:', error);
        setError('loadError');
        setLoading(false);
      }
    };

    checkAccessAndLoadData();
  }, [currentUser]);

  // Handle tab navigation
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // Handle back navigation
  const handleBackToHome = () => {
    navigate('/');
  };

  // Handle view public profile
  const handleViewPublicProfile = () => {
    if (company) {
      const companySlug = getCompanySlug(company.name);
      navigate(`/company/${companySlug}/${company.id}/overview`);
    }
  };

  // Show error states
  if (error === 'accessDenied') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {translations?.accessDenied || 'Access Denied'}
          </h2>
          <p className="text-gray-600 mb-6">
            {translations?.companyDashboardAccessDenied || 'Only company accounts can access the dashboard.'}
          </p>
          <button
            onClick={handleBackToHome}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {translations?.backToHome || 'Back to Home'}
          </button>
        </div>
      </div>
    );
  }

  if (error === 'companyNotFound') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {translations?.companyNotFound || 'Company Not Found'}
          </h2>
          <p className="text-gray-600 mb-6">
            {translations?.companyDashboardNotFound || 'We couldn\'t find the company associated with your account.'}
          </p>
          <button
            onClick={handleBackToHome}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {translations?.backToHome || 'Back to Home'}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
            <div className="flex items-center">
              <button
                onClick={handleBackToHome}
                className="mr-4 p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {translations?.companyDashboard || 'Company Dashboard'}
                {company && <span className="text-gray-500 text-lg ml-2">• {company.name}</span>}
              </h1>
            </div>
            
            <button
              onClick={handleViewPublicProfile}
              className="inline-flex items-center space-x-2 rtl:space-x-reverse text-blue-600 hover:text-blue-800 transition-colors duration-200 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg"
            >
              <ExternalLink className="h-4 w-4" />
              <span>{translations?.viewPublicProfile || 'View Public Profile'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Navigation Tabs */}
          <div className="border-b border-gray-200 overflow-x-auto">
            <div className="flex">
              <button
                onClick={() => handleTabChange('overview')}
                className={`flex items-center space-x-2 rtl:space-x-reverse px-6 py-4 text-sm font-medium ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart className="h-5 w-5" />
                <span>{translations?.overview || 'Overview'}</span>
              </button>
              
              <button
                onClick={() => handleTabChange('reviews')}
                className={`flex items-center space-x-2 rtl:space-x-reverse px-6 py-4 text-sm font-medium ${
                  activeTab === 'reviews'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <MessageSquare className="h-5 w-5" />
                <span>{translations?.reviews || 'Reviews'}</span>
              </button>
              
              <button
                onClick={() => handleTabChange('gallery')}
                className={`flex items-center space-x-2 rtl:space-x-reverse px-6 py-4 text-sm font-medium ${
                  activeTab === 'gallery'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Image className="h-5 w-5" />
                <span>{translations?.gallery || 'Gallery'}</span>
              </button>
              
              {isDeveloper && (
                <button
                  onClick={() => handleTabChange('projects')}
                  className={`flex items-center space-x-2 rtl:space-x-reverse px-6 py-4 text-sm font-medium ${
                    activeTab === 'projects'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Briefcase className="h-5 w-5" />
                  <span>{translations?.projects || 'Projects'}</span>
                </button>
              )}
              
              <button
                onClick={() => handleTabChange('profile')}
                className={`flex items-center space-x-2 rtl:space-x-reverse px-6 py-4 text-sm font-medium ${
                  activeTab === 'profile'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Building2 className="h-5 w-5" />
                <span>{translations?.profileManagement || 'Profile Management'}</span>
              </button>
              
              <button
                onClick={() => handleTabChange('plan')}
                className={`flex items-center space-x-2 rtl:space-x-reverse px-6 py-4 text-sm font-medium ${
                  activeTab === 'plan'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Shield className="h-5 w-5" />
                <span>{translations?.plan || 'Plan'}</span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {company && (
              <>
                {activeTab === 'overview' && <OverviewTab company={company} />}
                {activeTab === 'reviews' && <ReviewsTab company={company} />}
                {activeTab === 'gallery' && <GalleryTab company={company} />}
                {activeTab === 'projects' && isDeveloper && <ProjectsTab company={company} />}
                {activeTab === 'profile' && <ProfileManagementTab company={company} setCompany={setCompany} />}
                {activeTab === 'plan' && <PlanTab company={company} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;