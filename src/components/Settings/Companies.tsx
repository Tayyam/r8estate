import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, Eye, Shield, AlignRight, Mail, Calendar, Search, Check, X, MapPin } from 'lucide-react';
import { collection, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { Company } from '../../types/company';
import { Category, egyptianGovernorates } from '../../types/company';
import { getCompanySlug } from '../../utils/urlUtils';

interface CompaniesProps {
  onNavigateToProfile?: (companyId: string, companyName: string) => void;
}

const Companies: React.FC<CompaniesProps> = ({ onNavigateToProfile }) => {
  const { currentUser } = useAuth();
  const { translations, language } = useLanguage();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [companiesPerPage] = useState(10);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Verify/Unverify state
  const [verifyLoading, setVerifyLoading] = useState<string | null>(null);

  // Check if user is admin
  const isAdmin = currentUser?.role === 'admin';

  // Load companies data
  useEffect(() => {
    const loadCompanies = async () => {
      if (!isAdmin) return;
      
      try {
        setLoading(true);
        
        // Load companies
        const companiesQuery = query(collection(db, 'companies'), orderBy('createdAt', 'desc'));
        const companiesSnapshot = await getDocs(companiesQuery);
        const companiesData = companiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        })) as Company[];
        
        setCompanies(companiesData);
        
        // Load categories for filtering
        const categoriesQuery = query(collection(db, 'categories'), orderBy('name'));
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        })) as Category[];
        
        setCategories(categoriesData);
        
      } catch (err) {
        console.error('Error loading companies:', err);
        setError(translations?.failedToLoadCompanies || 'Failed to load companies');
        setTimeout(() => setError(''), 5000);
      } finally {
        setLoading(false);
      }
    };
    
    loadCompanies();
  }, [isAdmin, translations]);

  // Filter companies
  const filteredCompanies = companies.filter(company => {
    // Search query filter
    const matchesSearch = 
      (company.name && company.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (company.email && company.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Category filter
    const matchesCategory = selectedCategory === 'all' || company.categoryId === selectedCategory;
    
    // Location filter
    const matchesLocation = selectedLocation === 'all' || company.location === selectedLocation;
    
    return matchesSearch && matchesCategory && matchesLocation;
  });

  // Paginate companies
  const indexOfLastCompany = currentPage * companiesPerPage;
  const indexOfFirstCompany = indexOfLastCompany - companiesPerPage;
  const currentCompanies = filteredCompanies.slice(indexOfFirstCompany, indexOfLastCompany);
  const totalPages = Math.ceil(filteredCompanies.length / companiesPerPage);

  // Get category name
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (category) {
      return language === 'ar' ? category.nameAr || category.name : category.name;
    }
    return translations?.unknownCategory || 'Unknown Category';
  };

  // Get governorate name
  const getGovernorateName = (governorateId: string) => {
    const governorate = egyptianGovernorates.find(gov => gov.id === governorateId);
    return governorate ? (language === 'ar' ? governorate.nameAr || governorate.name : governorate.name) : governorateId;
  };

  // Handle delete company
  const handleDeleteCompany = async () => {
    if (!companyToDelete) return;
    
    try {
      setDeleteLoading(true);
      
      // Delete company from Firestore
      await deleteDoc(doc(db, 'companies', companyToDelete.id));
      
      // Update local state
      setCompanies(companies.filter(c => c.id !== companyToDelete.id));
      
      // Show success message
      setSuccess(translations?.companyDeletedSuccess || 'Company deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
      
      // Close modal
      setShowDeleteConfirm(false);
      setCompanyToDelete(null);
      
    } catch (err) {
      console.error('Error deleting company:', err);
      setError(translations?.failedToDeleteCompany || 'Failed to delete company');
      setTimeout(() => setError(''), 5000);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle verify/unverify company
  const handleToggleVerification = async (company: Company) => {
    try {
      setVerifyLoading(company.id);
      
      // Update verification status
      await updateDoc(doc(db, 'companies', company.id), {
        verified: !company.verified,
        updatedAt: new Date()
      });
      
      // Update local state
      setCompanies(companies.map(c => {
        if (c.id === company.id) {
          return { ...c, verified: !company.verified };
        }
        return c;
      }));
      
      // Show success message
      setSuccess(
        company.verified 
          ? (translations?.companyUnverifiedSuccess || 'Company unverified successfully')
          : (translations?.companyVerifiedSuccess || 'Company verified successfully')
      );
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Error toggling verification:', err);
      setError(translations?.failedToUpdateCompany || 'Failed to update company verification status');
      setTimeout(() => setError(''), 5000);
    } finally {
      setVerifyLoading(null);
    }
  };

  // Handle view company profile
  const handleViewProfile = (company: Company) => {
    if (onNavigateToProfile) {
      onNavigateToProfile(company.id, company.name);
    } else {
      const companySlug = getCompanySlug(company.name);
      navigate(`/company/${companySlug}/${company.id}/overview`);
    }
  };

  // Handle edit company (to be implemented)
  const handleEditCompany = (company: Company) => {
    console.log('Edit company:', company.id);
    // Implementation for editing companies would go here
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedLocation('all');
  };

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <Building2 className="h-6 w-6" style={{ color: '#194866' }} />
            <div>
              <h2 className="text-xl font-bold" style={{ color: '#194866' }}>
                {translations?.companyManagement || 'Company Management'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {translations?.totalCompanies?.replace('{count}', companies.length.toString()) || `Total companies: ${companies.length}`}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse">
            <button
              className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm shadow-sm"
              onClick={() => console.log('Add company - not implemented')}
            >
              <Plus className="h-4 w-4" />
              <span>{translations?.addCompany || 'Add Company'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center space-x-2 rtl:space-x-reverse">
          <X className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center space-x-2 rtl:space-x-reverse">
          <Check className="h-5 w-5" />
          <span>{success}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4 rtl:space-x-reverse">
          {/* Search */}
          <div className="w-full lg:w-64 relative">
            <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder={translations?.searchCompanies || 'Search companies...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 rtl:pr-10 rtl:pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
            />
          </div>
          
          {/* Category Filter */}
          <div className="w-full lg:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
            >
              <option value="all">{translations?.allCategories || 'All Categories'}</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {language === 'ar' ? (category.nameAr || category.name) : category.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Location Filter */}
          <div className="w-full lg:w-48">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
            >
              <option value="all">{translations?.allLocations || 'All Locations'}</option>
              {egyptianGovernorates.map(governorate => (
                <option key={governorate.id} value={governorate.id}>
                  {language === 'ar' ? governorate.nameAr : governorate.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Reset Filters */}
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            {translations?.clearFilters || 'Clear Filters'}
          </button>
        </div>
        
        {/* Results Counter */}
        <div className="text-sm text-gray-600 mt-4">
          {translations?.showingCompanies?.replace('{current}', filteredCompanies.length.toString()).replace('{total}', companies.length.toString()) || `Showing ${filteredCompanies.length} of ${companies.length} companies`}
        </div>
      </div>

      {/* Companies Table */}
      {loading ? (
        <div className="p-6 text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-gray-600">{translations?.loadingCompanies || 'Loading companies...'}</p>
        </div>
      ) : currentCompanies.length === 0 ? (
        <div className="p-6 text-center">
          <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">{translations?.noCompaniesFound || 'No companies found'}</p>
        </div>
      ) : (
        <>
          {/* Desktop View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {translations?.company || 'Company'}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {translations?.category || 'Category'}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {translations?.location || 'Location'}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {translations?.status || 'Status'}
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {translations?.createdDate || 'Created'}
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {translations?.actions || 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentCompanies.map(company => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-lg overflow-hidden">
                          {company.logoUrl ? (
                            <img 
                              src={company.logoUrl}
                              alt={company.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{company.name}</span>
                          <div className="flex items-center space-x-1 rtl:space-x-reverse">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{company.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {getCategoryName(company.categoryId)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-700">{getGovernorateName(company.location)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        company.verified
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {company.verified 
                          ? translations?.verifiedStatus || 'Verified'
                          : translations?.unverifiedStatus || 'Not Verified'
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {formatDate(company.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2 rtl:space-x-reverse">
                        <button
                          onClick={() => handleViewProfile(company)}
                          className="text-blue-600 hover:text-blue-800 transition-colors p-1 rounded hover:bg-blue-50"
                          title={translations?.viewProfile || 'View Profile'}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditCompany(company)}
                          className="text-amber-600 hover:text-amber-800 transition-colors p-1 rounded hover:bg-amber-50"
                          title={translations?.editCompany || 'Edit Company'}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleVerification(company)}
                          disabled={verifyLoading === company.id}
                          className={`transition-colors p-1 rounded ${
                            company.verified
                              ? 'text-red-600 hover:text-red-800 hover:bg-red-50'
                              : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                          } ${verifyLoading === company.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={company.verified 
                            ? translations?.unverifyCompany || 'Unverify Company'
                            : translations?.verifyCompany || 'Verify Company'
                          }
                        >
                          {verifyLoading === company.id ? (
                            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setCompanyToDelete(company);
                            setShowDeleteConfirm(true);
                          }}
                          className="text-red-600 hover:text-red-800 transition-colors p-1 rounded hover:bg-red-50"
                          title={translations?.deleteCompany || 'Delete Company'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="lg:hidden divide-y divide-gray-200">
            {currentCompanies.map(company => (
              <div key={company.id} className="p-4">
                <div className="flex items-start space-x-3 rtl:space-x-reverse mb-3">
                  <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-lg overflow-hidden">
                    {company.logoUrl ? (
                      <img 
                        src={company.logoUrl}
                        alt={company.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <p className="font-medium text-gray-900 truncate">{company.name}</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        company.verified
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {company.verified 
                          ? translations?.verifiedStatus || 'Verified'
                          : translations?.unverifiedStatus || 'Not Verified'
                        }
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 rtl:space-x-reverse">
                      <Mail className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500 truncate">{company.email}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">{translations?.category || 'Category'}</span>
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {getCategoryName(company.categoryId)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">{translations?.location || 'Location'}</span>
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-700">{getGovernorateName(company.location)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>{formatDate(company.createdAt)}</span>
                  </div>
                  
                  <div className="flex space-x-2 rtl:space-x-reverse">
                    <button
                      onClick={() => handleViewProfile(company)}
                      className="text-blue-600 hover:text-blue-800 transition-colors p-1.5 rounded hover:bg-blue-50"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditCompany(company)}
                      className="text-amber-600 hover:text-amber-800 transition-colors p-1.5 rounded hover:bg-amber-50"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleToggleVerification(company)}
                      disabled={verifyLoading === company.id}
                      className={`transition-colors p-1.5 rounded ${
                        company.verified
                          ? 'text-red-600 hover:text-red-800 hover:bg-red-50'
                          : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                      } ${verifyLoading === company.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {verifyLoading === company.id ? (
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Shield className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setCompanyToDelete(company);
                        setShowDeleteConfirm(true);
                      }}
                      className="text-red-600 hover:text-red-800 transition-colors p-1.5 rounded hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {!loading && filteredCompanies.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between">
          <div className="text-sm text-gray-500 mb-2 sm:mb-0">
            {translations?.showingCompanies?.replace('{current}', currentCompanies.length.toString()).replace('{total}', filteredCompanies.length.toString()) || `Showing ${currentCompanies.length} of ${filteredCompanies.length} companies`}
          </div>
          
          <div className="flex space-x-2 rtl:space-x-reverse">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {translations?.previous || 'Previous'}
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
                    <React.Fragment key={`ellipsis-${page}`}>
                      <span className="px-3 py-1 text-gray-500">...</span>
                      <button
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 border rounded-md ${
                          currentPage === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
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
              className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {translations?.next || 'Next'}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && companyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
                <Trash2 className="h-8 w-8 text-red-600" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {translations?.deleteCompanyTitle || 'Delete Company'}
              </h3>
              
              <p className="text-gray-600 mb-6">
                {translations?.confirmDeleteCompany?.replace('{name}', companyToDelete.name) || 
                `Are you sure you want to delete "${companyToDelete.name}"? This action cannot be undone.`}
              </p>
              
              <div className="flex space-x-3 rtl:space-x-reverse justify-center">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setCompanyToDelete(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={deleteLoading}
                >
                  {translations?.cancel || 'Cancel'}
                </button>
                
                <button
                  onClick={handleDeleteCompany}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 rtl:space-x-reverse disabled:opacity-70"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{translations?.deleting || 'Deleting...'}</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>{translations?.delete || 'Delete'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Companies;