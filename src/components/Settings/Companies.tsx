import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, Plus, Edit, Trash2, CheckCircle, AlertCircle, Search, 
  Upload, Download, Filter, ExternalLink, Eye, MapPin, Shield
} from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import * as XLSX from 'xlsx';
import { db, functions, storage } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { Company, egyptianGovernorates } from '../../types/company';
import { generateCompanyTemplate, parseCompaniesExcel } from '../../utils/excelUtils';

interface CompaniesProps {
  onNavigateToProfile?: (companyId: string) => void;
}

const Companies: React.FC<CompaniesProps> = ({ onNavigateToProfile }) => {
  const { translations } = useLanguage();
  const { currentUser } = useAuth();
  
  // State variables
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<{id: string; name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [verifiedFilter, setVerifiedFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    categoryId: '',
    location: '',
    description: '',
    phone: '',
    website: '',
    logoUrl: ''
  });
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bulkUploadInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize the cloud function
  const createUserFunction = httpsCallable(functions, 'createUser');
  
  // Load categories from Firestore
  const loadCategories = async () => {
    try {
      const categoriesQuery = query(collection(db, 'categories'), orderBy('name'));
      const categoriesSnapshot = await getDocs(categoriesQuery);
      const categoriesData = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };
  
  // Load companies from Firestore
  const loadCompanies = async () => {
    try {
      setLoading(true);
      const companiesQuery = query(collection(db, 'companies'), orderBy('name'));
      const companiesSnapshot = await getDocs(companiesQuery);
      const companiesData = companiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Company[];
      
      setCompanies(companiesData);
    } catch (error) {
      console.error('Error loading companies:', error);
      setError(translations?.failedToLoadCompanies || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };
  
  // Initial data loading
  useEffect(() => {
    loadCategories();
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
    
    // Verified filter
    const matchesVerified = 
      verifiedFilter === 'all' || 
      (verifiedFilter === 'verified' && company.verified) || 
      (verifiedFilter === 'unverified' && !company.verified);
    
    return matchesSearch && matchesCategory && matchesLocation && matchesVerified;
  });
  
  // Handle logo upload
  const handleLogoUpload = async (file: File): Promise<string> => {
    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(translations?.invalidFileType || 'Invalid file type. Please upload a JPG or PNG file.');
      }
      
      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        throw new Error(translations?.fileTooLarge || 'File size too large. Maximum size is 5MB.');
      }
      
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `company-logos/${fileName}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      throw error;
    }
  };
  
  // Handle logo selection
  const handleLogoSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    try {
      const file = e.target.files[0];
      const logoUrl = await handleLogoUpload(file);
      
      setFormData(prev => ({
        ...prev,
        logoUrl
      }));
    } catch (error: any) {
      setError(error.message || (translations?.failedToUploadLogo || 'Failed to upload logo'));
      setTimeout(() => setError(''), 3000);
    }
  };
  
  // Add new company
  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password || !formData.categoryId || !formData.location) {
      setError(translations?.fillAllRequiredFields || 'Please fill in all required fields');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    try {
      setActionLoading(true);
      setError('');
      
      // Create company user with Firebase Auth function
      const result = await createUserFunction({
        email: formData.email,
        password: formData.password,
        displayName: formData.name,
        role: 'company'
      });
      
      const data = result.data as any;
      
      if (data.success && data.user) {
        // Create company document in Firestore
        const companyData = {
          name: formData.name,
          email: formData.email,
          categoryId: formData.categoryId,
          location: formData.location,
          description: formData.description || '',
          phone: formData.phone || '',
          website: formData.website || '',
          logoUrl: formData.logoUrl || '',
          verified: false,
          totalRating: 0,
          totalReviews: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const companyDoc = await addDoc(collection(db, 'companies'), companyData);
        
        // Update user document to store company ID reference
        await updateDoc(doc(db, 'users', data.user.uid), {
          companyId: companyDoc.id,
          updatedAt: new Date()
        });
        
        // Reset form and update UI
        setFormData({
          name: '',
          email: '',
          password: '',
          categoryId: '',
          location: '',
          description: '',
          phone: '',
          website: '',
          logoUrl: ''
        });
        
        setShowAddModal(false);
        setSuccess(translations?.companyCreatedSuccess || 'Company created successfully');
        setTimeout(() => setSuccess(''), 3000);
        
        // Reload companies
        loadCompanies();
      } else {
        throw new Error(data.message || (translations?.failedToCreateCompany || 'Failed to create company'));
      }
    } catch (error: any) {
      console.error('Error creating company:', error);
      setError(error.message || (translations?.failedToCreateCompany || 'Failed to create company'));
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(false);
    }
  };
  
  // Edit company
  const handleEditCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompany || !formData.name || !formData.categoryId || !formData.location) {
      setError(translations?.fillAllRequiredFields || 'Please fill in all required fields');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    try {
      setActionLoading(true);
      setError('');
      
      // Update company document
      const companyData = {
        name: formData.name,
        categoryId: formData.categoryId,
        location: formData.location,
        description: formData.description || '',
        phone: formData.phone || '',
        website: formData.website || '',
        logoUrl: formData.logoUrl || '',
        updatedAt: new Date()
      };
      
      await updateDoc(doc(db, 'companies', selectedCompany.id), companyData);
      
      setShowEditModal(false);
      setSelectedCompany(null);
      setSuccess(translations?.companyUpdatedSuccess || 'Company updated successfully');
      setTimeout(() => setSuccess(''), 3000);
      
      // Reload companies
      loadCompanies();
    } catch (error: any) {
      console.error('Error updating company:', error);
      setError(error.message || (translations?.failedToUpdateCompany || 'Failed to update company'));
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(false);
    }
  };
  
  // Delete company
  const handleDeleteCompany = async () => {
    if (!selectedCompany) return;
    
    try {
      setActionLoading(true);
      setError('');
      
      // Delete company logo if exists
      if (selectedCompany.logoUrl) {
        try {
          const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/r8estate-2a516.firebasestorage.app/o/';
          if (selectedCompany.logoUrl.startsWith(baseUrl)) {
            const filePath = decodeURIComponent(selectedCompany.logoUrl.replace(baseUrl, '').split('?')[0]);
            const storageRef = ref(storage, filePath);
            await deleteObject(storageRef);
          }
        } catch (error) {
          console.error('Error deleting logo:', error);
          // Continue with company deletion even if logo deletion fails
        }
      }
      
      // Delete company document
      await deleteDoc(doc(db, 'companies', selectedCompany.id));
      
      // Find user with company ID reference
      const usersQuery = query(
        collection(db, 'users'),
        where('companyId', '==', selectedCompany.id)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      // Delete users with this company ID
      const deleteUserPromises = usersSnapshot.docs.map(async (userDoc) => {
        try {
          await deleteDoc(doc(db, 'users', userDoc.id));
        } catch (error) {
          console.error(`Error deleting user ${userDoc.id}:`, error);
        }
      });
      
      await Promise.all(deleteUserPromises);
      
      // Update UI
      setCompanies(companies.filter(company => company.id !== selectedCompany.id));
      setShowDeleteModal(false);
      setSelectedCompany(null);
      setSuccess(translations?.companyDeletedSuccess || 'Company deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error deleting company:', error);
      setError(error.message || (translations?.failedToDeleteCompany || 'Failed to delete company'));
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(false);
    }
  };
  
  // Toggle company verification
  const handleToggleVerification = async (company: Company) => {
    try {
      await updateDoc(doc(db, 'companies', company.id), {
        verified: !company.verified,
        updatedAt: new Date()
      });
      
      // Update local state
      setCompanies(companies.map(c => 
        c.id === company.id 
          ? {...c, verified: !c.verified, updatedAt: new Date()} 
          : c
      ));
      
      setSuccess(
        company.verified 
          ? (translations?.companyUnverifiedSuccess || 'Company unverified successfully')
          : (translations?.companyVerifiedSuccess || 'Company verified successfully')
      );
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error toggling verification:', error);
      setError(error.message || (translations?.failedToUpdateCompany || 'Failed to update company'));
      setTimeout(() => setError(''), 3000);
    }
  };
  
  // Open edit modal
  const openEditModal = (company: Company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      email: company.email,
      password: '', // Don't include password in edit mode
      categoryId: company.categoryId,
      location: company.location,
      description: company.description || '',
      phone: company.phone || '',
      website: company.website || '',
      logoUrl: company.logoUrl || ''
    });
    setShowEditModal(true);
  };
  
  // Open delete modal
  const openDeleteModal = (company: Company) => {
    setSelectedCompany(company);
    setShowDeleteModal(true);
  };
  
  // Get category name by ID
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown';
  };
  
  // Get location name by ID
  const getLocationName = (locationId: string) => {
    const location = egyptianGovernorates.find(loc => loc.id === locationId);
    return location ? location.name : locationId;
  };
  
  // Handle view company profile
  const handleViewProfile = (companyId: string) => {
    if (onNavigateToProfile) {
      onNavigateToProfile(companyId);
    }
  };
  
  // Generate template for bulk company upload
  const handleGenerateTemplate = () => {
    generateCompanyTemplate(categories);
  };
  
  // Handle bulk upload
  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    try {
      setActionLoading(true);
      setError('');
      
      const file = e.target.files[0];
      
      // Parse Excel file
      const companies = await parseCompaniesExcel(file, categories);
      
      // Create companies one by one
      let successCount = 0;
      let failureCount = 0;
      
      for (const company of companies) {
        try {
          // Create company user with Firebase Auth function
          const result = await createUserFunction({
            email: company.email,
            password: company.password,
            displayName: company.name,
            role: 'company'
          });
          
          const data = result.data as any;
          
          if (data.success && data.user) {
            // Find category ID by name
            const category = categories.find(
              cat => cat.name.toLowerCase() === company.categoryName.toLowerCase()
            );
            
            // Find location ID by name
            const location = egyptianGovernorates.find(
              loc => loc.name.toLowerCase() === company.location.toLowerCase()
            );
            
            // Create company document in Firestore
            const companyData = {
              name: company.name,
              email: company.email,
              categoryId: category?.id || '',
              location: location?.id || company.location,
              description: company.description || '',
              phone: company.phone || '',
              website: company.website || '',
              logoUrl: '',
              verified: false,
              totalRating: 0,
              totalReviews: 0,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            const companyDoc = await addDoc(collection(db, 'companies'), companyData);
            
            // Update user document to store company ID reference
            await updateDoc(doc(db, 'users', data.user.uid), {
              companyId: companyDoc.id,
              updatedAt: new Date()
            });
            
            successCount++;
          } else {
            failureCount++;
          }
        } catch (error) {
          console.error('Error creating company:', error);
          failureCount++;
        }
      }
      
      // Show results
      if (successCount > 0) {
        setSuccess(
          translations?.bulkUploadSuccess?.replace('{success}', successCount.toString()).replace('{failure}', failureCount.toString()) ||
          `Successfully created ${successCount} companies. Failed: ${failureCount}.`
        );
      } else {
        setError(translations?.bulkUploadFailed || 'Failed to create any companies');
      }
      
      setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
      
      // Reload companies
      loadCompanies();
      
      // Close modal
      setShowBulkUploadModal(false);
      
    } catch (error: any) {
      console.error('Error handling bulk upload:', error);
      setError(error.message || (translations?.failedToProcessExcel || 'Failed to process Excel file'));
      setTimeout(() => setError(''), 5000);
    } finally {
      setActionLoading(false);
      // Reset file input
      if (bulkUploadInputRef.current) {
        bulkUploadInputRef.current.value = '';
      }
    }
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
                  translations?.totalCompanies?.replace('{count}', companies.length.toString()) || 
                  `Total companies: ${companies.length}`
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse">
            {/* Bulk Upload Button */}
            <button
              onClick={() => setShowBulkUploadModal(true)}
              className="flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-medium transition-all duration-200 hover:bg-blue-50 text-sm"
            >
              <Upload className="h-4 w-4" />
              <span>{translations?.bulkUpload || 'Bulk Upload'}</span>
            </button>
            
            {/* Add Company Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg text-sm"
              style={{ backgroundColor: '#194866' }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#0f3147';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#194866';
              }}
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
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm sm:text-base">{error}</p>
        </div>
      )}

      {success && (
        <div className="mx-4 sm:mx-8 mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center space-x-3 rtl:space-x-reverse">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700 text-sm sm:text-base">{success}</p>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="px-4 sm:px-8 py-4 border-b border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative lg:col-span-2">
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
          <div className="relative">
            <Filter className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-10 rtl:pr-10 rtl:pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200 appearance-none"
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
            >
              <option value="all">{translations?.allCategories || 'All Categories'}</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Location Filter */}
          <div className="relative">
            <MapPin className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full pl-10 rtl:pr-10 rtl:pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200 appearance-none"
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
            >
              <option value="all">{translations?.allLocations || 'All Locations'}</option>
              {egyptianGovernorates.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Verified Filter */}
          <div className="relative">
            <Shield className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              value={verifiedFilter}
              onChange={(e) => setVerifiedFilter(e.target.value)}
              className="w-full pl-10 rtl:pr-10 rtl:pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200 appearance-none"
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
            >
              <option value="all">{translations?.allStatuses || 'All Statuses'}</option>
              <option value="verified">{translations?.verifiedStatus || 'Verified'}</option>
              <option value="unverified">{translations?.unverifiedStatus || 'Unverified'}</option>
            </select>
          </div>
        </div>
        
        {!loading && (
          <div className="text-sm text-gray-600 mt-3">
            {translations?.showingCompanies?.replace('{current}', filteredCompanies.length.toString()).replace('{total}', companies.length.toString()) ||
             `Showing ${filteredCompanies.length} of ${companies.length} companies`}
          </div>
        )}
      </div>

      {/* Companies List */}
      <div className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">{translations?.noCompaniesFound || 'No companies found'}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-8 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      {translations?.company || 'Company'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      {translations?.category || 'Category'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      {translations?.location || 'Location'}
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-gray-500 uppercase tracking-wider">
                      {translations?.verified || 'Verified'}
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">
                      {translations?.actions || 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCompanies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50 transition-colors duration-150">
                      {/* Company Info */}
                      <td className="px-8 py-6">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 mr-4 bg-gray-100 flex items-center justify-center">
                            {company.logoUrl ? (
                              <img 
                                src={company.logoUrl} 
                                alt={company.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Building2 className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 mb-1">
                              {company.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {company.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-6">
                        <span className="text-sm text-gray-900">
                          {getCategoryName(company.categoryId)}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="px-6 py-6">
                        <span className="text-sm text-gray-900">
                          {getLocationName(company.location)}
                        </span>
                      </td>

                      {/* Verified */}
                      <td className="px-6 py-6 text-center">
                        <button
                          onClick={() => handleToggleVerification(company)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            company.verified
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <Shield className={`w-3 h-3 mr-1 ${company.verified ? 'text-green-600' : 'text-gray-500'}`} />
                          {company.verified 
                            ? translations?.verifiedStatus || 'Verified' 
                            : translations?.unverifiedStatus || 'Unverified'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* View Profile Button */}
                          <button
                            onClick={() => handleViewProfile(company.id)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-150"
                            title={translations?.viewCompanyProfile || 'View Company Profile'}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            {translations?.viewProfile || 'View'}
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => openEditModal(company)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-150"
                            title={translations?.editCompany || 'Edit Company'}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            {translations?.edit || 'Edit'}
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => openDeleteModal(company)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 transition-colors duration-150"
                            title={translations?.deleteCompany || 'Delete Company'}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            {translations?.delete || 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden">
              <div className="space-y-4 p-4">
                {filteredCompanies.map((company) => (
                  <div key={company.id} className="bg-gray-50 rounded-xl p-4 space-y-3">
                    {/* Company Info */}
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                        {company.logoUrl ? (
                          <img 
                            src={company.logoUrl} 
                            alt={company.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building2 className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {company.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {company.email}
                        </div>
                      </div>
                    </div>

                    {/* Company Details */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">{translations?.category || 'Category'}:</span>{' '}
                        <span className="font-medium">{getCategoryName(company.categoryId)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{translations?.location || 'Location'}:</span>{' '}
                        <span className="font-medium">{getLocationName(company.location)}</span>
                      </div>
                    </div>

                    {/* Verification Badge */}
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => handleToggleVerification(company)}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          company.verified
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <Shield className={`w-3 h-3 mr-1 ${company.verified ? 'text-green-600' : 'text-gray-500'}`} />
                        {company.verified 
                          ? translations?.verifiedStatus || 'Verified' 
                          : translations?.unverifiedStatus || 'Unverified'}
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2 rtl:space-x-reverse pt-2">
                      <button
                        onClick={() => handleViewProfile(company.id)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-150"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        {translations?.viewProfile || 'View'}
                      </button>
                      <button
                        onClick={() => openEditModal(company)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-150"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        {translations?.edit || 'Edit'}
                      </button>
                      <button
                        onClick={() => openDeleteModal(company)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 transition-colors duration-150"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        {translations?.delete || 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Company Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-screen overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold mb-6" style={{ color: '#194866' }}>
              {translations?.addNewCompany || 'Add New Company'}
            </h3>
            <form onSubmit={handleAddCompany} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translations?.companyName || 'Company Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={translations?.enterCompanyName || 'Enter company name'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                  />
                </div>
                
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translations?.companyEmail || 'Company Email'} *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={translations?.enterCompanyEmail || 'Enter company email'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                  />
                </div>
                
                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translations?.companyPassword || 'Company Password'} *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={translations?.enterCompanyPassword || 'Enter company password'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {translations?.passwordMinLength || 'Password must be at least 6 characters'}
                  </p>
                </div>
                
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translations?.companyCategory || 'Company Category'} *
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                  >
                    <option value="">{translations?.selectCategory || 'Select category'}</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translations?.companyLocation || 'Company Location'} *
                  </label>
                  <select
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                  >
                    <option value="">{translations?.selectLocation || 'Select location'}</option>
                    {egyptianGovernorates.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translations?.companyPhone || 'Company Phone'}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder={translations?.enterPhone || 'Enter phone number'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                  />
                </div>
                
                {/* Website */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translations?.companyWebsite || 'Company Website'}
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder={translations?.enterWebsite || 'Enter website URL'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                  />
                </div>
                
                {/* Logo */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translations?.companyLogo || 'Company Logo'}
                  </label>
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    {formData.logoUrl ? (
                      <div className="w-14 h-14 rounded-lg overflow-hidden">
                        <img 
                          src={formData.logoUrl} 
                          alt="Company Logo Preview" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        onChange={handleLogoSelection}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm flex items-center space-x-2 rtl:space-x-reverse"
                      >
                        <Upload className="w-4 h-4" />
                        <span>
                          {formData.logoUrl
                            ? translations?.changeLogo || 'Change Logo'
                            : translations?.uploadLogo || 'Upload Logo'}
                        </span>
                      </button>
                      <p className="text-xs text-gray-500 mt-1">
                        {translations?.logoRequirements || 'Max size: 5MB. Formats: JPG, PNG'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translations?.companyDescription || 'Company Description'}
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={translations?.enterDescription || 'Enter company description'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-4">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 text-white py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 rtl:space-x-reverse"
                  style={{ backgroundColor: '#194866' }}
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{translations?.createCompany || 'Create Company'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({
                      name: '',
                      email: '',
                      password: '',
                      categoryId: '',
                      location: '',
                      description: '',
                      phone: '',
                      website: '',
                      logoUrl: ''
                    });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200 disabled:opacity-50"
                >
                  {translations?.cancel || 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Company Modal */}
      {showEditModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-screen overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold mb-6" style={{ color: '#194866' }}>
              {translations?.editCompany || 'Edit Company'}
            </h3>
            <form onSubmit={handleEditCompany} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translations?.companyName || 'Company Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                  />
                </div>
                
                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translations?.companyEmail || 'Company Email'}
                  </label>
                  <input
                    type="email"
                    readOnly
                    value={formData.email}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {translations?.emailCannotChange || 'Email cannot be changed'}
                  </p>
                </div>
                
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translations?.companyCategory || 'Company Category'} *
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                  >
                    <option value="">{translations?.selectCategory || 'Select category'}</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translations?.companyLocation || 'Company Location'} *
                  </label>
                  <select
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                  >
                    <option value="">{translations?.selectLocation || 'Select location'}</option>
                    {egyptianGovernorates.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translations?.companyPhone || 'Company Phone'}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder={translations?.enterPhone || 'Enter phone number'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                  />
                </div>
                
                {/* Website */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translations?.companyWebsite || 'Company Website'}
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder={translations?.enterWebsite || 'Enter website URL'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                  />
                </div>
                
                {/* Logo */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translations?.companyLogo || 'Company Logo'}
                  </label>
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    {formData.logoUrl ? (
                      <div className="w-14 h-14 rounded-lg overflow-hidden">
                        <img 
                          src={formData.logoUrl} 
                          alt="Company Logo Preview" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        onChange={handleLogoSelection}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm flex items-center space-x-2 rtl:space-x-reverse"
                      >
                        <Upload className="w-4 h-4" />
                        <span>
                          {formData.logoUrl
                            ? translations?.changeLogo || 'Change Logo'
                            : translations?.uploadLogo || 'Upload Logo'}
                        </span>
                      </button>
                      <p className="text-xs text-gray-500 mt-1">
                        {translations?.logoRequirements || 'Max size: 5MB. Formats: JPG, PNG'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translations?.companyDescription || 'Company Description'}
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={translations?.enterDescription || 'Enter company description'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-4">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 rtl:space-x-reverse"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Edit className="w-4 h-4" />
                      <span>{translations?.updateCompany || 'Update Company'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedCompany(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200 disabled:opacity-50"
                >
                  {translations?.cancel || 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Company Modal */}
      {showDeleteModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-screen overflow-y-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-4 text-gray-900">
                {translations?.deleteCompanyTitle || 'Delete Company'}
              </h3>
              <p className="text-gray-600 mb-6 text-sm sm:text-base">
                {translations?.confirmDeleteCompany?.replace('{name}', selectedCompany.name) || 
                 `Are you sure you want to delete "${selectedCompany.name}"? This action cannot be undone and will permanently remove all company data.`}
              </p>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse">
                <button
                  onClick={handleDeleteCompany}
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 rtl:space-x-reverse"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>{translations?.deleteCompanyButton || 'Delete Company'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedCompany(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200 disabled:opacity-50"
                >
                  {translations?.cancel || 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-screen overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold mb-6" style={{ color: '#194866' }}>
              {translations?.bulkUploadTitle || 'Bulk Upload Companies'}
            </h3>
            <div className="space-y-6">
              {/* Template Download */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">
                  {translations?.downloadTemplateDesc || 'Download Excel template to fill company data'}
                </h4>
                <button
                  onClick={handleGenerateTemplate}
                  disabled={actionLoading}
                  className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors duration-200 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{translations?.downloadTemplate || 'Download Template'}</span>
                </button>
              </div>
              
              {/* File Upload */}
              <div>
                <h4 className="font-medium text-gray-800 mb-2">
                  {translations?.uploadInstructions || 'Choose an Excel file containing company data'}
                </h4>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors duration-200"
                  onClick={() => bulkUploadInputRef.current?.click()}
                >
                  <input
                    ref={bulkUploadInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleBulkUpload}
                    className="hidden"
                  />
                  {actionLoading ? (
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-gray-600">{translations?.processingFile || 'Processing file...'}</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 mb-2">{translations?.chooseFile || 'Choose file'}</p>
                      <p className="text-xs text-gray-500">
                        .xlsx, .xls
                      </p>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 rtl:space-x-reverse">
                <button
                  onClick={() => setShowBulkUploadModal(false)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-gray-300 text-gray-700 hover:bg-gray-400 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
                >
                  {translations?.cancel || 'Cancel'}
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