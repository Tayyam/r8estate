import React, { useState } from 'react';
import { Eye, Edit, Trash2, Building2, MapPin, Star, Calendar, Shield, ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Company, Category, egyptianGovernorates } from '../../../types/company';

interface CompanyListProps {
  companies: Company[];
  loading: boolean;
  categories: Category[];
  onViewCompany: (company: Company) => void;
  onEditCompany: (company: Company) => void;
  onDeleteCompany: (company: Company) => void;
  onNavigateToProfile?: (companyId: string, companyName: string) => void;
}

const COMPANIES_PER_PAGE = 8;

const CompanyList: React.FC<CompanyListProps> = ({
  companies,
  loading,
  categories,
  onViewCompany,
  onEditCompany,
  onDeleteCompany,
  onNavigateToProfile
}) => {
  const { translations, direction } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(companies.length / COMPANIES_PER_PAGE);
  const indexOfLastCompany = currentPage * COMPANIES_PER_PAGE;
  const indexOfFirstCompany = indexOfLastCompany - COMPANIES_PER_PAGE;
  const currentCompanies = companies.slice(indexOfFirstCompany, indexOfLastCompany);
  
  // Get category name by ID
  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? (category.nameAr || category.name) : 'Unknown Category';
  };

  // Get location name by ID
  const getLocationName = (locationId: string): string => {
    const location = egyptianGovernorates.find(loc => loc.id === locationId);
    return location ? (location.nameAr || location.name) : locationId;
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">{translations?.noCompaniesFound || 'No companies found'}</p>
        </div>
      ) : (
        <div>
          {/* Desktop View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full" dir={direction}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-start text-sm font-medium text-gray-500 uppercase tracking-wider">
                    {translations?.company || 'Company'}
                  </th>
                  <th className="px-6 py-4 text-start text-sm font-medium text-gray-500 uppercase tracking-wider">
                    {translations?.category || 'Category'}
                  </th>
                  <th className="px-6 py-4 text-start text-sm font-medium text-gray-500 uppercase tracking-wider">
                    {translations?.location || 'Location'}
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-500 uppercase tracking-wider">
                    {translations?.verified || 'Verified'}
                  </th>
                  <th className="px-6 py-4 text-end text-sm font-medium text-gray-500 uppercase tracking-wider">
                    {translations?.createdDate || 'Created'}
                  </th>
                  <th className="px-6 py-4 text-end text-sm font-medium text-gray-500 uppercase tracking-wider">
                    {translations?.actions || 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 mr-4 rtl:ml-4 rtl:mr-0">
                          {company.logoUrl ? (
                            <img
                              src={company.logoUrl}
                              alt={company.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Building2 className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{company.name}</div>
                          <div className="text-sm text-gray-500">{company.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getCategoryName(company.categoryId)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin className="h-4 w-4 mr-1 rtl:ml-1 rtl:mr-0" />
                        <span>{getLocationName(company.location)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {company.verified ? (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {translations?.verifiedStatus || 'Verified'}
                        </span>
                      ) : (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          {translations?.unverifiedStatus || 'Unverified'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-end">
                      <div className="flex items-center justify-end space-x-1 rtl:space-x-reverse">
                        <Calendar className="h-4 w-4" />
                        <span>{company.createdAt.toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-end">
                      <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse">
                        {onNavigateToProfile && (
                          <button
                            onClick={() => onNavigateToProfile(company.id, company.name)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title={translations?.viewCompanyProfile || 'View Company Profile'}
                          >
                            <ExternalLink className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => onViewCompany(company)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title={translations?.view || 'View'}
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => onEditCompany(company)}
                          className="text-orange-600 hover:text-orange-900 p-1"
                          title={translations?.edit || 'Edit'}
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => onDeleteCompany(company)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title={translations?.delete || 'Delete'}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="lg:hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
              {currentCompanies.map((company) => (
                <div key={company.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200">
                  <div className="p-4">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden mr-4 rtl:ml-4 rtl:mr-0">
                        {company.logoUrl ? (
                          <img
                            src={company.logoUrl}
                            alt={company.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building2 className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{company.name}</div>
                        <div className="text-xs text-gray-500 truncate">{company.email}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                      <div className="flex items-center">
                        <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center mr-1 rtl:ml-1 rtl:mr-0">
                          <Building2 className="h-3 w-3 text-gray-600" />
                        </div>
                        <span className="text-gray-600">{getCategoryName(company.categoryId)}</span>
                      </div>

                      <div className="flex items-center">
                        <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center mr-1 rtl:ml-1 rtl:mr-0">
                          <MapPin className="h-3 w-3 text-gray-600" />
                        </div>
                        <span className="text-gray-600">{getLocationName(company.location)}</span>
                      </div>

                      <div className="flex items-center">
                        <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center mr-1 rtl:ml-1 rtl:mr-0">
                          <Shield className="h-3 w-3 text-gray-600" />
                        </div>
                        <span className="text-gray-600">
                          {company.verified ? 
                            (translations?.verifiedStatus || 'Verified') : 
                            (translations?.unverifiedStatus || 'Unverified')}
                        </span>
                      </div>

                      <div className="flex items-center">
                        <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center mr-1 rtl:ml-1 rtl:mr-0">
                          <Calendar className="h-3 w-3 text-gray-600" />
                        </div>
                        <span className="text-gray-600">{company.createdAt.toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex justify-between border-t border-gray-100 pt-3">
                      {onNavigateToProfile && (
                        <button
                          onClick={() => onNavigateToProfile(company.id, company.name)}
                          className="text-xs flex items-center justify-center px-2 py-1 rounded-lg text-blue-600 hover:bg-blue-50"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1 rtl:ml-1 rtl:mr-0" />
                          <span>{translations?.profile || 'Profile'}</span>
                        </button>
                      )}
                      <button
                        onClick={() => onViewCompany(company)}
                        className="text-xs flex items-center justify-center px-2 py-1 rounded-lg text-blue-600 hover:bg-blue-50"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1 rtl:ml-1 rtl:mr-0" />
                        <span>{translations?.view || 'View'}</span>
                      </button>
                      <button
                        onClick={() => onEditCompany(company)}
                        className="text-xs flex items-center justify-center px-2 py-1 rounded-lg text-orange-600 hover:bg-orange-50"
                      >
                        <Edit className="h-3.5 w-3.5 mr-1 rtl:ml-1 rtl:mr-0" />
                        <span>{translations?.edit || 'Edit'}</span>
                      </button>
                      <button
                        onClick={() => onDeleteCompany(company)}
                        className="text-xs flex items-center justify-center px-2 py-1 rounded-lg text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1 rtl:ml-1 rtl:mr-0" />
                        <span>{translations?.delete || 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination */}
          {companies.length > 0 && (
            <div className="px-4 sm:px-8 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between">
              <div className="text-sm text-gray-700 mb-4 sm:mb-0">
                {translations?.showingResults?.replace('{start}', String(indexOfFirstCompany + 1))
                  .replace('{end}', String(Math.min(indexOfLastCompany, companies.length)))
                  .replace('{total}', String(companies.length)) || 
                 `Showing ${indexOfFirstCompany + 1}-${Math.min(indexOfLastCompany, companies.length)} of ${companies.length} results`}
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => 
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  )
                  .map((page, index, array) => {
                    // Add ellipsis
                    if (index > 0 && array[index - 1] !== page - 1) {
                      return (
                        <span key={`ellipsis-before-${page}`} className="px-3 py-1 text-gray-500">...</span>
                      );
                    }
                    
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 border rounded-md ${
                          currentPage === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanyList;