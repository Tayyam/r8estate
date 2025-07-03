import React from 'react';
import { Edit, Trash2, Building2, MapPin, Globe, Phone, Mail, Calendar, Link2, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Company, Category, egyptianGovernorates } from '../../../types/company';

interface ViewCompanyModalProps {
  company: Company;
  categories: Category[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onNavigateToProfile?: (companyId: string, companyName: string) => void;
}

const ViewCompanyModal: React.FC<ViewCompanyModalProps> = ({
  company,
  categories,
  onClose,
  onEdit,
  onDelete,
  onNavigateToProfile
}) => {
  const { translations, language } = useLanguage();
  
  // Get category name by ID with language support
  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(cat => cat.id === categoryId);
    // Use the appropriate name based on language
    return category ? (language === 'ar' ? (category.nameAr || category.name) : category.name) : 'Unknown Category';
  };

  // Get location name by ID with language support
  const getLocationName = (locationId: string): string => {
    const location = egyptianGovernorates.find(loc => loc.id === locationId);
    // Use the appropriate name based on language
    return location ? (language === 'ar' ? (location.nameAr || location.name) : location.name) : locationId;
  };

  // Format website URL for display
  const formatWebsiteUrl = (url: string | undefined): string => {
    if (!url) return '';
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{company.name}</h3>
          </div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {onNavigateToProfile && (
              <button
                onClick={() => onNavigateToProfile(company.id, company.name)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                title={translations?.viewCompanyProfile || "View Company Profile"}
              >
                <ExternalLink className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={onEdit}
              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors duration-200"
              title={translations?.edit || "Edit"}
            >
              <Edit className="h-5 w-5" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
              title={translations?.delete || "Delete"}
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Company Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Logo and Details */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-gray-50 p-6 rounded-xl">
              <div className="w-32 h-32 bg-white rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden">
                {company.logoUrl ? (
                  <img src={company.logoUrl} alt={company.name} className="max-w-full max-h-full object-contain p-2" />
                ) : (
                  <Building2 className="h-16 w-16 text-gray-300" />
                )}
              </div>
              
              <div className="flex-1 text-center sm:text-left rtl:sm:text-right">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{company.name}</h3>
                
                <div className="mb-4 flex flex-wrap justify-center sm:justify-start rtl:sm:justify-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${company.verified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {company.verified ? (translations?.verifiedStatus || 'Verified') : (translations?.unverifiedStatus || 'Unverified')}
                  </span>
                  
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {getCategoryName(company.categoryId)}
                  </span>
                </div>
                
                <p className="text-gray-600 max-w-xl">
                  {company.description || (translations?.noDescriptionAvailable || 'No description available.')}
                </p>
              </div>
            </div>
            
            {/* Created/Updated Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <span className="text-gray-600 font-medium">{translations?.createdDate || 'Created'}</span>
                </div>
                <p className="mt-1 text-gray-800">
                  {company.createdAt.toLocaleDateString()} {company.createdAt.toLocaleTimeString()}
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <span className="text-gray-600 font-medium">{translations?.updatedDate || 'Last Updated'}</span>
                </div>
                <p className="mt-1 text-gray-800">
                  {company.updatedAt.toLocaleDateString()} {company.updatedAt.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>

          {/* Right column - Contact Info */}
          <div className="space-y-4 bg-gray-50 p-6 rounded-xl">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              {translations?.contactInformation || 'Contact Information'}
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className="mt-0.5">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{translations?.email || 'Email'}</p>
                  <p className="text-gray-900">{company.email}</p>
                </div>
              </div>
              
              {company.phone && (
                <div className="flex items-start space-x-3 rtl:space-x-reverse">
                  <div className="mt-0.5">
                    <Phone className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{translations?.phone || 'Phone'}</p>
                    <p className="text-gray-900">{company.phone}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className="mt-0.5">
                  <MapPin className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{translations?.location || 'Location'}</p>
                  <p className="text-gray-900">{getLocationName(company.location)}</p>
                </div>
              </div>
              
              {company.website && (
                <div className="flex items-start space-x-3 rtl:space-x-reverse">
                  <div className="mt-0.5">
                    <Globe className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{translations?.website || 'Website'}</p>
                    <a 
                      href={company.website} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 hover:text-blue-800 flex items-center space-x-1 rtl:space-x-reverse"
                    >
                      <span>{formatWebsiteUrl(company.website)}</span>
                      <Link2 className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors duration-200"
          >
            {translations?.close || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewCompanyModal;