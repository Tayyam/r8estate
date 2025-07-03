import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, Eye, Shield, Mail, Calendar, Search, Check, X, MapPin } from 'lucide-react';
import { collection, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { Company } from '../../types/company';
import { Category, egyptianGovernorates } from '../../types/company';
import { getCompanySlug } from '../../utils/urlUtils';
import { Table, TableColumn, TableAction } from '../UI';

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
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

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
    const matchesCategory = categoryFilter === 'all' || company.categoryId === categoryFilter;
    
    // Location filter
    const matchesLocation = locationFilter === 'all' || company.location === locationFilter;
    
    return matchesSearch && matchesCategory && matchesLocation;
  });

  // Paginate companies
  const paginatedCompanies = filteredCompanies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
      
    } catch (error) {
      console.error('Error toggling verification:', error);
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

  // Handle edit company
  const handleEditCompany = (company: Company) => {
    console.log('Edit company:', company.id);
    // Implementation for editing companies would go here
  };

  // Define table columns
  const columns: TableColumn<Company>[] = [
    {
      id: 'company',
      header: translations?.company || 'Company',
      accessor: (company: Company) => (
        <div className="flex items-center">
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
          <div className="ml-3 rtl:mr-3 rtl:ml-0">
            <span className="font-medium text-gray-900">{company.name}</span>
            <div className="flex items-center space-x-1 rtl:space-x-reverse">
              <Mail className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500">{company.email}</span>
            </div>
          </div>
        </div>
      ),
      width: '30%'
    },
    {
      id: 'category',
      header: translations?.category || 'Category',
      accessor: (company: Company) => (
        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
          {getCategoryName(company.categoryId)}
        </span>
      ),
      width: '20%'
    },
    {
      id: 'location',
      header: translations?.location || 'Location',
      accessor: (company: Company) => (
        <div className="flex items-center">
          <MapPin className="h-4 w-4 text-gray-400 mr-1 rtl:ml-1 rtl:mr-0" />
          <span className="text-sm text-gray-700">{getGovernorateName(company.location)}</span>
        </div>
      ),
      width: '20%'
    },
    {
      id: 'status',
      header: translations?.status || 'Status',
      accessor: (company: Company) => (
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
      ),
      width: '15%'
    },
    {
      id: 'createdAt',
      header: translations?.createdDate || 'Created',
      accessor: (company: Company) => (
        <div className="text-sm text-gray-500">
          {company.createdAt.toLocaleDateString()}
        </div>
      ),
      sortable: true,
      width: '15%'
    }
  ];

  // Define table actions
  const actions: TableAction<Company>[] = [
    {
      label: translations?.viewProfile || 'View',
      onClick: (company) => handleViewProfile(company),
      icon: <Eye className="h-4 w-4" />,
      color: '#3B82F6'
    },
    {
      label: translations?.editProfile || 'Edit',
      onClick: (company) => handleEditCompany(company),
      icon: <Edit className="h-4 w-4" />,
      color: '#F97316'
    },
    {
      label: company => company.verified 
        ? translations?.unverifyCompany || 'Unverify' 
        : translations?.verifyCompany || 'Verify',
      onClick: (company) => handleToggleVerification(company),
      icon: <Shield className="h-4 w-4" />,
      color: company => company.verified ? '#EF4444' : '#10B981',
      disabled: (company) => verifyLoading === company.id
    },
    {
      label: translations?.deleteProfile || 'Delete',
      onClick: (company) => {
        setCompanyToDelete(company);
        setShowDeleteConfirm(true);
      },
      icon: <Trash2 className="h-4 w-4" />,
      color: '#EF4444'
    }
  ];

  // Define table filters
  const filters = [
    {
      id: 'category',
      label: translations?.category || 'Category',
      options: [
        { value: 'all', label: translations?.allCategories || 'All Categories' },
        ...categories.map(cat => ({
          value: cat.id,
          label: language === 'ar' ? (cat.nameAr || cat.name) : cat.name
        }))
      ],
      value: categoryFilter,
      onChange: setCategoryFilter
    },
    {
      id: 'location',
      label: translations?.location || 'Location',
      options: [
        { value: 'all', label: translations?.allLocations || 'All Locations' },
        ...egyptianGovernorates.map(gov => ({
          value: gov.id,
          label: language === 'ar' ? (gov.nameAr || gov.name) : gov.name
        }))
      ],
      value: locationFilter,
      onChange: setLocationFilter
    }
  ];

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

      {/* Table Component */}
      <div className="p-6">
        <Table
          columns={columns}
          data={paginatedCompanies}
          keyExtractor={(company) => company.id}
          loading={loading}
          actions={actions}
          filters={filters}
          searchable={true}
          searchPlaceholder={translations?.searchCompanies || 'Search companies...'}
          onSearch={setSearchQuery}
          pagination={{
            currentPage,
            totalPages: Math.ceil(filteredCompanies.length / itemsPerPage),
            onPageChange: setCurrentPage,
            itemsPerPage,
            totalItems: filteredCompanies.length
          }}
          emptyState={{
            icon: <Building2 className="h-12 w-12 text-gray-400 mx-auto" />,
            title: translations?.noCompaniesFound || 'No Companies Found',
            description: translations?.adjustSearchCriteria || 'Try adjusting your search criteria or filters'
          }}
        />
      </div>

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