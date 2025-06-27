import React, { useState, useEffect, useRef } from 'react';
import { Building2, Plus, Trash2, Edit, Upload, Tag, MapPin, Mail, Calendar, AlertCircle, CheckCircle, Search, Eye, Download, FileSpreadsheet, Camera, User } from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import { Company, Category, egyptianGovernorates } from '../../types/company';
import { uploadCompanyLogo, deleteCompanyLogo } from '../../utils/storageUtils';
import { generateCompanyTemplate, parseCompaniesExcel, ExcelCompanyData } from '../../utils/excelUtils';
import Categories from './Categories';

interface CompaniesProps {
  onNavigateToProfile?: (companyId: string) => void;
}

const Companies: React.FC<CompaniesProps> = ({ onNavigateToProfile }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bulkData, setBulkData] = useState<ExcelCompanyData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  
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

  // Initialize the cloud function
  const createUserFunction = httpsCallable(functions, 'createUser');

  // Load companies from Firestore
  const loadCompanies = async () => {
    try {
      setLoading(true);
      const companiesQuery = query(collection(db, 'companies'), orderBy('createdAt', 'desc'));
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
      setError('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  // Load categories from Firestore
  const loadCategories = async () => {
    try {
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
      console.error('Error loading categories:', error);
    }
  };

  useEffect(() => {
    loadCompanies();
    loadCategories();
  }, []);

  // Filter companies based on search query
  const filteredCompanies = companies.filter(company => 
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get category name by ID
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  // Get category ID by name
  const getCategoryIdByName = (categoryName: string) => {
    const category = categories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase());
    return category ? category.id : '';
  };

  // Get governorate name by ID
  const getGovernorateName = (governorateId: string) => {
    const governorate = egyptianGovernorates.find(gov => gov.id === governorateId);
    return governorate ? governorate.name : governorateId;
  };

  // Get governorate ID by name
  const getGovernorateIdByName = (governorateName: string) => {
    const governorate = egyptianGovernorates.find(gov => gov.name.toLowerCase() === governorateName.toLowerCase());
    return governorate ? governorate.id : '';
  };

  // Handle logo file selection
  const handleLogoSelect = (file: File) => {
    setSelectedLogo(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle logo upload
  const uploadLogo = async (companyId: string): Promise<string> => {
    if (!selectedLogo) return '';

    try {
      setUploadLoading(true);
      const logoUrl = await uploadCompanyLogo(selectedLogo, companyId);
      return logoUrl;
    } catch (error: any) {
      throw new Error(`Logo upload failed: ${error.message}`);
    } finally {
      setUploadLoading(false);
    }
  };

  // Add new company
  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.categoryId || !formData.location) {
      setError('Please fill in all required fields');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      
      // Create user account for the company
      const result = await createUserFunction({
        email: formData.email,
        password: formData.password,
        displayName: formData.name,
        role: 'company'
      });

      const data = result.data as any;
      
      if (data.success) {
        let logoUrl = '';
        
        // Upload logo if selected
        if (selectedLogo) {
          logoUrl = await uploadLogo(data.user.uid);
        }

        // Create company document
        await addDoc(collection(db, 'companies'), {
          name: formData.name,
          email: formData.email,
          categoryId: formData.categoryId,
          location: formData.location,
          description: formData.description || '',
          phone: formData.phone || '',
          website: formData.website || '',
          logoUrl: logoUrl,
          verified: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        setSuccess('Company created successfully');
        resetForm();
        setShowAddModal(false);
        loadCompanies();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(data.error || 'Failed to create company');
      }
    } catch (error: any) {
      console.error('Error adding company:', error);
      setError(error.message || 'Failed to add company');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  // Edit company
  const handleEditCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !formData.name || !formData.categoryId || !formData.location) return;

    try {
      setActionLoading(true);
      setError('');
      
      let logoUrl = selectedCompany.logoUrl || '';
      
      // Upload new logo if selected
      if (selectedLogo) {
        // Delete old logo if exists
        if (selectedCompany.logoUrl) {
          await deleteCompanyLogo(selectedCompany.logoUrl);
        }
        logoUrl = await uploadLogo(selectedCompany.id);
      }
      
      await updateDoc(doc(db, 'companies', selectedCompany.id), {
        name: formData.name,
        categoryId: formData.categoryId,
        location: formData.location,
        description: formData.description || '',
        phone: formData.phone || '',
        website: formData.website || '',
        logoUrl: logoUrl,
        updatedAt: new Date()
      });

      setSuccess('Company updated successfully');
      resetForm();
      setShowEditModal(false);
      setSelectedCompany(null);
      loadCompanies();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error updating company:', error);
      setError('Failed to update company');
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
      
      // Delete logo if exists
      if (selectedCompany.logoUrl) {
        await deleteCompanyLogo(selectedCompany.logoUrl);
      }
      
      await deleteDoc(doc(db, 'companies', selectedCompany.id));

      setCompanies(companies.filter(comp => comp.id !== selectedCompany.id));
      setSuccess('Company deleted successfully');
      setShowDeleteModal(false);
      setSelectedCompany(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error deleting company:', error);
      setError('Failed to delete company');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle bulk upload
  const handleBulkUpload = async () => {
    if (bulkData.length === 0) return;

    try {
      setBulkLoading(true);
      setError('');
      
      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];

      for (const companyData of bulkData) {
        try {
          // Get category ID
          const categoryId = getCategoryIdByName(companyData.categoryName);
          const locationId = getGovernorateIdByName(companyData.location);
          
          if (!categoryId) {
            errors.push(`Company "${companyData.name}": Invalid category "${companyData.categoryName}"`);
            failureCount++;
            continue;
          }

          if (!locationId) {
            errors.push(`Company "${companyData.name}": Invalid location "${companyData.location}"`);
            failureCount++;
            continue;
          }

          // Create user account
          const result = await createUserFunction({
            email: companyData.email,
            password: companyData.password,
            displayName: companyData.name,
            role: 'company'
          });

          const data = result.data as any;
          
          if (data.success) {
            // Create company document
            await addDoc(collection(db, 'companies'), {
              name: companyData.name,
              email: companyData.email,
              categoryId: categoryId,
              location: locationId,
              description: companyData.description || '',
              phone: companyData.phone || '',
              website: companyData.website || '',
              logoUrl: '',
              verified: false,
              createdAt: new Date(),
              updatedAt: new Date()
            });

            successCount++;
          } else {
            errors.push(`Company "${companyData.name}": ${data.error || 'Failed to create account'}`);
            failureCount++;
          }
        } catch (error: any) {
          errors.push(`Company "${companyData.name}": ${error.message}`);
          failureCount++;
        }
      }

      let message = `Bulk upload completed. ${successCount} companies created successfully.`;
      if (failureCount > 0) {
        message += ` ${failureCount} companies failed.`;
        if (errors.length > 0) {
          console.error('Bulk upload errors:', errors);
        }
      }

      setSuccess(message);
      setBulkData([]);
      setShowBulkUploadModal(false);
      loadCompanies();
      setTimeout(() => setSuccess(''), 5000);
    } catch (error: any) {
      console.error('Error in bulk upload:', error);
      setError('Bulk upload failed');
      setTimeout(() => setError(''), 3000);
    } finally {
      setBulkLoading(false);
    }
  };

  // Generate Excel template
  const handleDownloadTemplate = () => {
    generateCompanyTemplate(categories);
  };

  // Handle Excel file upload
  const handleExcelUpload = async (file: File) => {
    try {
      setBulkLoading(true);
      setError('');
      
      const companies = await parseCompaniesExcel(file, categories);
      setBulkData(companies);
      setShowBulkUploadModal(true);
    } catch (error: any) {
      setError(error.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setBulkLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
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
    setSelectedLogo(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Open edit modal
  const openEditModal = (company: Company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      email: company.email,
      password: '',
      categoryId: company.categoryId,
      location: company.location,
      description: company.description || '',
      phone: company.phone || '',
      website: company.website || '',
      logoUrl: company.logoUrl || ''
    });
    setLogoPreview(company.logoUrl || null);
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (company: Company) => {
    setSelectedCompany(company);
    setShowDeleteModal(true);
  };

  // Handle profile navigation
  const handleViewProfile = (company: Company) => {
    if (onNavigateToProfile) {
      onNavigateToProfile(company.id);
    }
  };

  // Close modals
  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowBulkUploadModal(false);
    setSelectedCompany(null);
    setBulkData([]);
    resetForm();
    setError('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Section Header */}
      <div className="px-4 sm:px-8 py-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <Building2 className="h-6 w-6" style={{ color: '#194866' }} />
            <h2 className="text-xl sm:text-2xl font-bold" style={{ color: '#194866' }}>
              Companies Management
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse">
            {/* Download Template Button */}
            <button
              onClick={handleDownloadTemplate}
              disabled={categories.length === 0}
              className="flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 border border-gray-300 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg text-sm disabled:opacity-50"
              style={{ color: '#10B981', borderColor: '#10B981' }}
              onMouseEnter={(e) => {
                if (categories.length > 0) {
                  e.target.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <Download className="h-4 w-4" />
              <span>Download Template</span>
            </button>

            {/* Bulk Upload Button */}
            <div className="relative">
              <input
                ref={bulkFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleExcelUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <button
                onClick={() => bulkFileInputRef.current?.click()}
                disabled={bulkLoading || categories.length === 0}
                className="flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg text-sm disabled:opacity-50"
                style={{ backgroundColor: '#8B5CF6' }}
                onMouseEnter={(e) => {
                  if (!bulkLoading && categories.length > 0) {
                    e.target.style.backgroundColor = '#7C3AED';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!bulkLoading && categories.length > 0) {
                    e.target.style.backgroundColor = '#8B5CF6';
                  }
                }}
              >
                {bulkLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                <span>Bulk Upload</span>
              </button>
            </div>
            
            {/* Add Company Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg text-sm"
              style={{ backgroundColor: '#2563eb' }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#1d4ed8';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#2563eb';
              }}
            >
              <Plus className="h-4 w-4" />
              <span>Add Company</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="mx-4 sm:mx-8 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 rtl:space-x-reverse">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-700 text-sm sm:text-base whitespace-pre-line">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mx-4 sm:mx-8 mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start space-x-3 rtl:space-x-reverse">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-green-700 text-sm sm:text-base">{success}</p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="px-4 sm:px-8 py-4 border-b border-gray-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search companies..."
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
            <p className="text-gray-500">No companies found</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-8 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCompanies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50 transition-colors duration-150">
                      {/* Company Info */}
                      <td className="px-8 py-6">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mr-4 overflow-hidden" style={{ backgroundColor: '#194866' }}>
                            {company.logoUrl ? (
                              <img 
                                src={company.logoUrl} 
                                alt={company.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Building2 className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {company.name}
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <Mail className="w-3 h-3 mr-1" />
                              {company.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-6">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
                          <Tag className="w-3 h-3 mr-1" />
                          {getCategoryName(company.categoryId)}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="px-6 py-6">
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin className="w-3 h-3 mr-1" />
                          {getGovernorateName(company.location)}
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="px-6 py-6">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-3 h-3 mr-1" />
                          {company.createdAt.toLocaleDateString()}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewProfile(company)}
                            disabled={actionLoading}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 transition-colors duration-150 disabled:opacity-50"
                            title="View Profile"
                          >
                            <User className="w-3 h-3 mr-1" />
                            Profile
                          </button>
                          <button
                            onClick={() => openEditModal(company)}
                            disabled={actionLoading}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-150 disabled:opacity-50"
                            title="Edit Company"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteModal(company)}
                            disabled={actionLoading}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 transition-colors duration-150 disabled:opacity-50"
                            title="Delete Company"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
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
                      <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ backgroundColor: '#194866' }}>
                        {company.logoUrl ? (
                          <img 
                            src={company.logoUrl} 
                            alt={company.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building2 className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {company.name}
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <Mail className="w-3 h-3 mr-1" />
                          <span className="truncate">{company.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Category and Location */}
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
                        <Tag className="w-3 h-3 mr-1" />
                        {getCategoryName(company.categoryId)}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                        <MapPin className="w-3 h-3 mr-1" />
                        {getGovernorateName(company.location)}
                      </span>
                    </div>

                    {/* Created Date */}
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="w-3 h-3 mr-1" />
                      {company.createdAt.toLocaleDateString()}
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2 rtl:space-x-reverse pt-2">
                      <button
                        onClick={() => handleViewProfile(company)}
                        disabled={actionLoading}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 transition-colors duration-150 disabled:opacity-50"
                      >
                        <User className="w-4 h-4 mr-1" />
                        Profile
                      </button>
                      <button
                        onClick={() => openEditModal(company)}
                        disabled={actionLoading}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-150 disabled:opacity-50"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteModal(company)}
                        disabled={actionLoading}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 transition-colors duration-150 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Categories Management Modal */}
      <Categories
        isOpen={showCategoriesModal}
        onClose={() => setShowCategoriesModal(false)}
        onCategoryAdded={loadCategories}
      />

      {/* Add Company Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-screen overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold mb-6" style={{ color: '#194866' }}>
              Add New Company
            </h3>
            <form onSubmit={handleAddCompany} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Type *
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
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
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
                    <option value="">Select Location</option>
                    {egyptianGovernorates.map((gov) => (
                      <option key={gov.id} value={gov.id}>
                        {gov.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Logo
                  </label>
                  <div className="space-y-3">
                    {logoPreview && (
                      <div className="flex items-center space-x-3">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-16 h-16 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLogo(null);
                            setLogoPreview(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleLogoSelect(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                      >
                        <Camera className="h-4 w-4" />
                        <span className="text-sm">{logoPreview ? 'Change Logo' : 'Upload Logo'}</span>
                      </button>
                      <p className="text-xs text-gray-500 mt-1">
                        Optional. Max 5MB. Supported: JPEG, PNG, GIF, WebP
                      </p>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  disabled={actionLoading || uploadLoading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
                >
                  {actionLoading || uploadLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Create Company'
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Company Modal - Similar to Add Modal but with different title and submit handler */}
      {showEditModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-screen overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold mb-6" style={{ color: '#194866' }}>
              Edit Company
            </h3>
            <form onSubmit={handleEditCompany} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email (Read-only)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Type *
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
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
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
                    <option value="">Select Location</option>
                    {egyptianGovernorates.map((gov) => (
                      <option key={gov.id} value={gov.id}>
                        {gov.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Logo
                  </label>
                  <div className="space-y-3">
                    {logoPreview && (
                      <div className="flex items-center space-x-3">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-16 h-16 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLogo(null);
                            setLogoPreview(selectedCompany?.logoUrl || null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          {selectedLogo ? 'Cancel Change' : 'Remove'}
                        </button>
                      </div>
                    )}
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleLogoSelect(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                      >
                        <Camera className="h-4 w-4" />
                        <span className="text-sm">{logoPreview ? 'Change Logo' : 'Upload Logo'}</span>
                      </button>
                      <p className="text-xs text-gray-500 mt-1">
                        Optional. Max 5MB. Supported: JPEG, PNG, GIF, WebP
                      </p>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  disabled={actionLoading || uploadLoading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
                >
                  {actionLoading || uploadLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Update Company'
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200"
                >
                  Cancel
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
                Delete Company
              </h3>
              <p className="text-gray-600 mb-6 text-sm sm:text-base">
                Are you sure you want to delete "{selectedCompany.name}"? This action cannot be undone and will permanently remove all company data including the logo.
              </p>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse">
                <button
                  onClick={handleDeleteCompany}
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Delete Company'
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Preview Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-screen overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ color: '#194866' }}>
                Bulk Upload Preview
              </h3>
              <button
                onClick={closeModals}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-600">
                {bulkData.length} companies ready to be imported. Please review the data below:
              </p>
            </div>

            <div className="flex-1 overflow-auto mb-6">
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Name</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Email</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Category</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Location</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {bulkData.map((company, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">{company.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{company.email}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{company.categoryName}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{company.location}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{company.phone || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleBulkUpload}
                disabled={bulkLoading}
                className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
              >
                {bulkLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  `Import ${bulkData.length} Companies`
                )}
              </button>
              <button
                type="button"
                onClick={closeModals}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Companies;