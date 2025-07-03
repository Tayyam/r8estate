import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, Filter, Download, Upload } from 'lucide-react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Company } from '../../../types/company';
import { Category } from '../../../types/company';
import { egyptianGovernorates } from '../../../types/company';
import CompanyList from './CompanyList';
import AddCompanyModal from './AddCompanyModal';
import ViewCompanyModal from './ViewCompanyModal';
import EditCompanyModal from './EditCompanyModal';
import DeleteCompanyModal from './DeleteCompanyModal';
import BulkUploadModal from './BulkUploadModal';

interface CompaniesProps {
  onNavigateToProfile?: (companyId: string, companyName: string) => void;
}

const Companies: React.FC<CompaniesProps> = ({ onNavigateToProfile }) => {
  const { translations, language } = useLanguage();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load companies from Firestore
  const loadCompanies = async () => {
    try {
      setLoading(true);
      const companiesQuery = query(collection(db, 'companies'), orderBy('createdAt', 'desc'));
      const companiesSnapshot = await getDocs(companiesQuery);
      const companiesData = companiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        verified: doc.data().verified || false,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Company[];
      
      setCompanies(companiesData);
      
      // Also load categories
      const categoriesQuery = query(collection(db, 'categories'), orderBy('name', 'asc'));
      const categoriesSnapshot = await getDocs(categoriesQuery);
      const categoriesData = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Category[];
      
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading companies:', error);
      setError(translations?.failedToLoadCompanies || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  // Filter companies based on search query and filters
  const filteredCompanies = companies.filter(company => {
    // Search filter
    const matchesSearch = 
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (company.description && company.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Category filter
    const matchesCategory = categoryFilter === 'all' || company.categoryId === categoryFilter;
    
    // Location filter
    const matchesLocation = locationFilter === 'all' || company.location === locationFilter;
    
    // Verified status filter
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'verified' && company.verified) ||
                         (statusFilter === 'unverified' && !company.verified);
    
    return matchesSearch && matchesCategory && matchesLocation && matchesStatus;
  });

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setLocationFilter('all');
    setStatusFilter('all');
  };

  // Handle modals
  const handleViewCompany = (company: Company) => {
    setSelectedCompany(company);
    setShowViewModal(true);
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setShowEditModal(true);
  };

  const handleDeleteCompany = (company: Company) => {
    setSelectedCompany(company);
    setShowDeleteModal(true);
  };

  // Success/Error message handlers
  const handleSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleError = (message: string) => {
    setError(message);
    setTimeout(() => setError(''), 3000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Section Header */}
      <div className="px-4 sm:px-8 py-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <Building2 className="h-6 w-6" style={{ color: '#194866' }} />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold" style={{ color: '#194866' }}>
                {translations?.companyManagement || 'Company Management'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {loading ? (
                  translations?.loadingCompanies || 'Loading companies...'
                ) : (
                  translations?.totalCompanies?.replace('{count}', companies.length.toString()) || `Total companies: ${companies.length}`
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowBulkUploadModal(true)}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-green-600 text-white rounded-lg font-medium transition-all duration-200 text-sm"
            >
              <Upload className="h-4 w-4" />
              <span>{translations?.bulkUpload || 'Bulk Upload'}</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-white rounded-lg font-medium transition-all duration-200 text-sm"
              style={{ backgroundColor: '#194866' }}
            >
              <Plus className="h-4 w-4" />
              <span>{translations?.addCompany || 'Add Company'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="mx-4 sm:mx-8 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 rtl:space-x-reverse">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-red-700 text-sm sm:text-base">{error}</p>
        </div>
      )}

      {success && (
        <div className="mx-4 sm:mx-8 mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center space-x-3 rtl:space-x-reverse">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-green-700 text-sm sm:text-base">{success}</p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="px-4 sm:px-8 py-4 border-b border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder={translations?.searchCompanies || 'Search companies...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 rtl:pr-10 rtl:pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
              style={{ 
                focusBorderColor: '#194866',
                focusRingColor: '#194866'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#194866';
                e.target.style.boxShadow = `0 0 0 3px rgba(25, 72, 102, 0.1)`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
              style={{ 
                focusBorderColor: '#194866',
                focusRingColor: '#194866'
              }}
            >
              <option value="all">{translations?.allCategories || 'All Categories'}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {language === 'ar' ? (category.nameAr || category.name) : category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
              style={{ 
                focusBorderColor: '#194866',
                focusRingColor: '#194866'
              }}
            >
              <option value="all">{translations?.allLocations || 'All Locations'}</option>
              {egyptianGovernorates.map((governorate) => (
                <option key={governorate.id} value={governorate.id}>
                  {language === 'ar' ? (governorate.nameAr || governorate.name) : governorate.name}
                </option>
              ))}
            </select>
          </div>

          {/* Verified Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
              style={{ 
                focusBorderColor: '#194866',
                focusRingColor: '#194866'
              }}
            >
              <option value="all">{translations?.allStatuses || 'All Statuses'}</option>
              <option value="verified">{translations?.verifiedStatus || 'Verified'}</option>
              <option value="unverified">{translations?.unverifiedStatus || 'Unverified'}</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-center">
            <button
              onClick={clearFilters}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 text-gray-700 flex items-center justify-center space-x-2 rtl:space-x-reverse"
              disabled={searchQuery === '' && categoryFilter === 'all' && locationFilter === 'all' && statusFilter === 'all'}
            >
              <Filter className="h-4 w-4" />
              <span>{translations?.clearFilters || 'Clear Filters'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Companies List */}
      <CompanyList 
        companies={filteredCompanies}
        loading={loading}
        categories={categories}
        onViewCompany={handleViewCompany}
        onEditCompany={handleEditCompany}
        onDeleteCompany={handleDeleteCompany}
        onNavigateToProfile={onNavigateToProfile}
      />

      {/* Modals */}
      {showAddModal && (
        <AddCompanyModal 
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onSuccess={(message) => {
            handleSuccess(message);
            loadCompanies();
          }}
          onError={handleError}
        />
      )}

      {showViewModal && selectedCompany && (
        <ViewCompanyModal 
          company={selectedCompany}
          categories={categories}
          onClose={() => {
            setShowViewModal(false);
            setSelectedCompany(null);
          }}
          onEdit={() => {
            setShowViewModal(false);
            setShowEditModal(true);
          }}
          onDelete={() => {
            setShowViewModal(false);
            setShowDeleteModal(true);
          }}
          onNavigateToProfile={onNavigateToProfile}
        />
      )}

      {showEditModal && selectedCompany && (
        <EditCompanyModal 
          company={selectedCompany}
          categories={categories}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCompany(null);
          }}
          onSuccess={(message) => {
            handleSuccess(message);
            loadCompanies();
          }}
          onError={handleError}
        />
      )}

      {showDeleteModal && selectedCompany && (
        <DeleteCompanyModal 
          company={selectedCompany}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedCompany(null);
          }}
          onSuccess={(message) => {
            handleSuccess(message);
            loadCompanies();
          }}
          onError={handleError}
        />
      )}

      {showBulkUploadModal && (
        <BulkUploadModal 
          categories={categories}
          onClose={() => setShowBulkUploadModal(false)}
          onSuccess={(message) => {
            handleSuccess(message);
            loadCompanies();
          }}
          onError={handleError}
        />
      )}
    </div>
  );
};

export default Companies;