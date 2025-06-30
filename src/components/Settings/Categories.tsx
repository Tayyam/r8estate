import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Tag, AlertCircle, CheckCircle, Search, Upload, Download, File, Image } from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Category } from '../../types/company';
import * as XLSX from 'xlsx';

const Categories = () => {
  const { translations } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    description: '',
    descriptionAr: ''
  });
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconLoading, setIconLoading] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [parseProgress, setParseProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const editIconInputRef = useRef<HTMLInputElement>(null);

  // Load categories from Firestore
  const loadCategories = async () => {
    try {
      setLoading(true);
      const categoriesQuery = query(collection(db, 'categories'), orderBy('createdAt', 'desc'));
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
      setError(translations?.failedToLoadCategories || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Filter categories based on search query
  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (category.nameAr && category.nameAr.includes(searchQuery)) ||
    (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (category.descriptionAr && category.descriptionAr.includes(searchQuery))
  );

  // Handle icon upload
  const validateSvgFile = (file: File): boolean => {
    // Check file type
    if (file.type !== 'image/svg+xml') {
      setError(translations?.invalidFileType || 'Invalid file type. Please upload an SVG file');
      setTimeout(() => setError(''), 3000);
      return false;
    }

    // Check file size (max 100KB)
    const maxSize = 100 * 1024; // 100KB in bytes
    if (file.size > maxSize) {
      setError(translations?.fileTooLarge || 'File too large. Maximum size is 100KB');
      setTimeout(() => setError(''), 3000);
      return false;
    }

    return true;
  };

  const uploadIcon = async (file: File, categoryId: string): Promise<string | null> => {
    if (!validateSvgFile(file)) {
      return null;
    }

    setIconLoading(true);

    try {
      // Create a unique filename
      const timestamp = Date.now();
      const fileName = `${categoryId}_${timestamp}.svg`;
      
      // Create storage reference
      const storageRef = ref(storage, `category-icons/${fileName}`);
      
      // Upload file
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading SVG icon:', error);
      setError(translations?.failedToUploadIcon || 'Failed to upload icon');
      setTimeout(() => setError(''), 3000);
      return null;
    } finally {
      setIconLoading(false);
    }
  };

  const deleteIcon = async (iconUrl: string) => {
    try {
      const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/r8estate-2a516.firebasestorage.app/o/';
      if (iconUrl.startsWith(baseUrl)) {
        const filePath = decodeURIComponent(iconUrl.replace(baseUrl, '').split('?')[0]);
        const storageRef = ref(storage, filePath);
        await deleteObject(storageRef);
      }
    } catch (error) {
      console.error('Error deleting icon:', error);
      // Don't throw error for delete operations as it might be already deleted
    }
  };

  // Handle icon file selection
  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateSvgFile(file)) {
        setIconFile(file);
        
        if (isEdit && selectedCategory) {
          handleUpdateIcon(file);
        }
      }
    }
  };

  // Handle icon update for existing category
  const handleUpdateIcon = async (file: File) => {
    if (!selectedCategory) return;

    try {
      setIconLoading(true);
      
      // Delete old icon if exists
      if (selectedCategory.iconUrl) {
        await deleteIcon(selectedCategory.iconUrl);
      }
      
      // Upload new icon
      const iconUrl = await uploadIcon(file, selectedCategory.id);
      
      if (iconUrl) {
        // Update category document
        await updateDoc(doc(db, 'categories', selectedCategory.id), {
          iconUrl,
          updatedAt: new Date()
        });
        
        // Update local state
        setSelectedCategory({
          ...selectedCategory,
          iconUrl,
          updatedAt: new Date()
        });
        
        // Update categories list
        setCategories(categories.map(cat => 
          cat.id === selectedCategory.id 
            ? { ...cat, iconUrl, updatedAt: new Date() }
            : cat
        ));
        
        setSuccess(translations?.iconUploadedSuccess || 'Icon uploaded successfully');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error updating icon:', error);
      setError(translations?.failedToUploadIcon || 'Failed to upload icon');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIconLoading(false);
    }
  };

  // Handle removing icon
  const handleRemoveIcon = async (categoryId: string) => {
    try {
      const category = categories.find(cat => cat.id === categoryId);
      if (!category || !category.iconUrl) return;

      setIconLoading(true);
      
      // Delete icon from storage
      await deleteIcon(category.iconUrl);
      
      // Update category document
      await updateDoc(doc(db, 'categories', categoryId), {
        iconUrl: null,
        updatedAt: new Date()
      });
      
      // Update local state
      if (selectedCategory && selectedCategory.id === categoryId) {
        setSelectedCategory({
          ...selectedCategory,
          iconUrl: undefined,
          updatedAt: new Date()
        });
      }
      
      // Update categories list
      setCategories(categories.map(cat => 
        cat.id === categoryId 
          ? { ...cat, iconUrl: undefined, updatedAt: new Date() }
          : cat
      ));
      
      setSuccess(translations?.iconRemovedSuccess || 'Icon removed successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error removing icon:', error);
      setError(translations?.failedToRemoveIcon || 'Failed to remove icon');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIconLoading(false);
    }
  };

  // Add new category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setError(translations?.categoryNameRequired || 'Category name is required');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      
      const categoryData = {
        name: formData.name,
        nameAr: formData.nameAr || '',
        description: formData.description || '',
        descriptionAr: formData.descriptionAr || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add category to Firestore
      const docRef = await addDoc(collection(db, 'categories'), categoryData);
      
      // If icon was selected, upload it
      let iconUrl;
      if (iconFile) {
        iconUrl = await uploadIcon(iconFile, docRef.id);
        
        if (iconUrl) {
          // Update the category with the icon URL
          await updateDoc(doc(db, 'categories', docRef.id), {
            iconUrl,
            updatedAt: new Date()
          });
        }
      }
      
      setSuccess(translations?.categoryCreatedSuccess || 'Category added successfully');
      setFormData({ name: '', nameAr: '', description: '', descriptionAr: '' });
      setIconFile(null);
      setShowAddModal(false);
      loadCategories();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error adding category:', error);
      setError(translations?.failedToCreateCategory || 'Failed to add category');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  // Edit category
  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !formData.name) return;

    try {
      setActionLoading(true);
      setError('');
      
      await updateDoc(doc(db, 'categories', selectedCategory.id), {
        name: formData.name,
        nameAr: formData.nameAr || '',
        description: formData.description || '',
        descriptionAr: formData.descriptionAr || '',
        updatedAt: new Date()
      });

      setSuccess(translations?.categoryUpdatedSuccess || 'Category updated successfully');
      setFormData({ name: '', nameAr: '', description: '', descriptionAr: '' });
      setShowEditModal(false);
      setSelectedCategory(null);
      loadCategories();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error updating category:', error);
      setError(translations?.failedToUpdateCategory || 'Failed to update category');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete category
  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;

    try {
      setActionLoading(true);
      setError('');
      
      // If the category has an icon, delete it first
      if (selectedCategory.iconUrl) {
        await deleteIcon(selectedCategory.iconUrl);
      }
      
      await deleteDoc(doc(db, 'categories', selectedCategory.id));

      setCategories(categories.filter(cat => cat.id !== selectedCategory.id));
      setSuccess(translations?.categoryDeletedSuccess || 'Category deleted successfully');
      setShowDeleteModal(false);
      setSelectedCategory(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error deleting category:', error);
      setError(translations?.failedToDeleteCategory || 'Failed to delete category');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      nameAr: category.nameAr || '',
      description: category.description || '',
      descriptionAr: category.descriptionAr || ''
    });
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (category: Category) => {
    setSelectedCategory(category);
    setShowDeleteModal(true);
  };

  // Close modals
  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowBulkUploadModal(false);
    setSelectedCategory(null);
    setFormData({ name: '', nameAr: '', description: '', descriptionAr: '' });
    setIconFile(null);
    setBulkUploadFile(null);
    setParseProgress('');
    setError('');
  };

  // Generate Excel template for bulk upload
  const generateTemplate = () => {
    try {
      // Create template data
      const templateData = [
        {
          'Name (Required)': 'Example Category',
          'Name Arabic (Optional)': 'فئة مثال',
          'Description (Optional)': 'Description of the category',
          'Description Arabic (Optional)': 'وصف الفئة بالعربية'
        },
        // Empty row for user to fill
        {
          'Name (Required)': '',
          'Name Arabic (Optional)': '',
          'Description (Optional)': '',
          'Description Arabic (Optional)': ''
        }
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(templateData);
      
      // Set column widths
      const wscols = [
        { wch: 25 }, // Name
        { wch: 25 }, // Name Arabic
        { wch: 50 }, // Description
        { wch: 50 }  // Description Arabic
      ];
      ws['!cols'] = wscols;
      
      XLSX.utils.book_append_sheet(wb, ws, 'Categories');
      
      // Generate file
      const fileName = `category_template_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      setSuccess(translations?.templateDownloadedSuccess || 'Template downloaded successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error generating template:', error);
      setError(translations?.failedToGenerateTemplate || 'Failed to generate template');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Parse Excel file for bulk upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setBulkUploadFile(files[0]);
    }
  };

  // Process Excel file and add categories
  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bulkUploadFile) {
      setError(translations?.selectExcelFile || 'Please select an Excel file');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setParseProgress(translations?.processingFile || 'Processing file...');
      
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get the first sheet
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          setParseProgress(translations?.validatingData || 'Validating data...');
          
          // Validate data
          if (jsonData.length === 0) {
            setError(translations?.noDataInFile || 'No data found in the file');
            setActionLoading(false);
            setTimeout(() => setError(''), 3000);
            return;
          }
          
          // Process categories
          setParseProgress(translations?.addingCategories || 'Adding categories...');
          
          const addedCategories = [];
          const errors = [];
          
          for (const [index, row] of (jsonData as any[]).entries()) {
            const categoryName = row['Name (Required)']?.toString().trim();
            
            // Skip if no name provided
            if (!categoryName) {
              errors.push(`Row ${index + 2}: Category name is required`);
              continue;
            }

            // Create category object
            const categoryData = {
              name: categoryName,
              nameAr: row['Name Arabic (Optional)']?.toString().trim() || '',
              description: row['Description (Optional)']?.toString().trim() || '',
              descriptionAr: row['Description Arabic (Optional)']?.toString().trim() || '',
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            try {
              // Add to Firestore
              await addDoc(collection(db, 'categories'), categoryData);
              addedCategories.push(categoryName);
            } catch (error) {
              errors.push(`Row ${index + 2}: Error adding "${categoryName}" - ${(error as Error).message}`);
            }
          }
          
          // Show results
          if (addedCategories.length > 0) {
            setSuccess(translations?.categoriesAddedSuccess?.replace('{count}', addedCategories.length.toString()) || 
                       `Successfully added ${addedCategories.length} categories`);
            
            // If there were errors, show them
            if (errors.length > 0) {
              setError(translations?.someEntriesFailed?.replace('{count}', errors.length.toString()) || 
                       `${errors.length} entries failed. Check console for details.`);
              console.error('Bulk upload errors:', errors);
            }
            
            // Reload categories
            loadCategories();
            
            // Reset state
            setBulkUploadFile(null);
            setParseProgress('');
            setShowBulkUploadModal(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            
            setTimeout(() => setSuccess(''), 5000);
            setTimeout(() => setError(''), 5000);
          } else {
            setError(translations?.noValidCategories || 'No valid categories found in the file');
            setTimeout(() => setError(''), 3000);
          }
        } catch (error) {
          console.error('Error processing Excel file:', error);
          setError(translations?.excelParseError || 'Error processing Excel file. Please check the format.');
          setTimeout(() => setError(''), 3000);
        } finally {
          setActionLoading(false);
          setParseProgress('');
        }
      };
      
      reader.onerror = () => {
        setError(translations?.fileReadError || 'Error reading file');
        setActionLoading(false);
        setTimeout(() => setError(''), 3000);
      };
      
      reader.readAsArrayBuffer(bulkUploadFile);
      
    } catch (error) {
      console.error('Error uploading categories:', error);
      setError(translations?.uploadFailed || 'Failed to upload categories');
      setActionLoading(false);
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Section Header */}
      <div className="px-4 sm:px-8 py-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <Tag className="h-6 w-6" style={{ color: '#194866' }} />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold" style={{ color: '#194866' }}>
                {translations?.categoryManagement || 'Category Management'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {loading ? (
                  translations?.loadingCategories || 'Loading categories...'
                ) : (
                  translations?.totalCategories?.replace('{count}', categories.length.toString()) || `Total categories: ${categories.length}`
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <button
              onClick={() => setShowBulkUploadModal(true)}
              className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg text-sm hover:bg-indigo-700"
            >
              <Upload className="h-4 w-4" />
              <span>{translations?.bulkUpload || 'Bulk Upload'}</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg text-sm"
              style={{ backgroundColor: '#194866' }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#0f3147';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#194866';
              }}
            >
              <Plus className="h-4 w-4" />
              <span>{translations?.addCategory || 'Add Category'}</span>
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

      {/* Search Bar */}
      <div className="px-4 sm:px-8 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="relative max-w-md">
            <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder={translations?.searchCategories || 'Search categories...'}
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
          {!loading && (
            <div className="text-sm text-gray-600">
              {translations?.showingCategories?.replace('{current}', filteredCategories.length.toString()).replace('{total}', categories.length.toString()) || 
               `Showing ${filteredCategories.length} of ${categories.length} categories`}
            </div>
          )}
        </div>
      </div>

      {/* Categories List */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">{translations?.noCategoriesFound || 'No categories found'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => (
              <div key={category.id} className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-md">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse mb-2">
                      {/* Category Icon */}
                      <div className="w-10 h-10 flex-shrink-0 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                        {category.iconUrl ? (
                          // SVG from URL
                          <img 
                            src={category.iconUrl} 
                            alt={category.name} 
                            className="w-6 h-6"
                          />
                        ) : (
                          // Default icon
                          <Tag className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{category.name}</h3>
                        {category.nameAr && (
                          <p className="text-sm text-gray-600 truncate mb-1">{category.nameAr}</p>
                        )}
                      </div>
                    </div>
                    {category.description && (
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{category.description}</p>
                    )}
                  </div>
                  <div className="flex items-start space-x-1 rtl:space-x-reverse ml-3">
                    <button
                      onClick={() => openEditModal(category)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                      title={translations?.editCategory || 'Edit Category'}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(category)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                      title={translations?.deleteCategory || 'Delete Category'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* SVG Icon Upload Button */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    {translations?.createdDate?.replace('{date}', category.createdAt.toLocaleDateString()) || 
                     `Created: ${category.createdAt.toLocaleDateString()}`}
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="file"
                      accept=".svg"
                      className="hidden"
                      onChange={(e) => {
                        setSelectedCategory(category);
                        handleIconChange(e, true);
                      }}
                      id={`icon-upload-${category.id}`}
                    />
                    
                    <label
                      htmlFor={`icon-upload-${category.id}`}
                      className={`flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 text-xs font-medium rounded-md cursor-pointer transition-colors duration-200 ${
                        category.iconUrl ? 'text-green-700 bg-green-100 hover:bg-green-200' : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                      }`}
                    >
                      <Image className="w-3 h-3" />
                      <span>
                        {iconLoading && selectedCategory?.id === category.id ? (
                          translations?.uploadingIcon || 'Uploading...'
                        ) : category.iconUrl ? (
                          translations?.changeIcon || 'Change Icon'
                        ) : (
                          translations?.uploadIcon || 'Upload Icon'
                        )}
                      </span>
                    </label>
                    
                    {category.iconUrl && (
                      <button
                        onClick={() => handleRemoveIcon(category.id)}
                        disabled={iconLoading}
                        className="ml-2 flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 transition-colors duration-200 disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-screen overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold mb-6" style={{ color: '#194866' }}>
              {translations?.addNewCategory || 'Add New Category'}
            </h3>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.englishNameLabel || 'Category Name (English) *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={translations?.enterCategoryNameEn || 'Enter category name in English'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                  style={{ 
                    focusBorderColor: '#194866',
                    focusRingColor: '#194866'
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.arabicNameLabel || 'Category Name (Arabic)'}
                </label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  placeholder={translations?.enterCategoryNameAr || 'Enter category name in Arabic'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                  style={{ 
                    focusBorderColor: '#194866',
                    focusRingColor: '#194866'
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.descriptionLabel || 'Description (English)'}
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={translations?.enterCategoryDescription || 'Enter category description in English'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                  style={{ 
                    focusBorderColor: '#194866',
                    focusRingColor: '#194866'
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.descriptionLabelAr || 'Description (Arabic)'}
                </label>
                <textarea
                  rows={3}
                  value={formData.descriptionAr}
                  onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                  placeholder={translations?.enterCategoryDescriptionAr || 'Enter category description in Arabic'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                  style={{ 
                    focusBorderColor: '#194866',
                    focusRingColor: '#194866'
                  }}
                />
              </div>

              {/* SVG Icon Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.categoryIconLabel || 'Category Icon (SVG)'}
                </label>
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <div className="w-12 h-12 border border-gray-300 rounded-md flex items-center justify-center bg-gray-50">
                    {iconFile ? (
                      <img 
                        src={URL.createObjectURL(iconFile)} 
                        alt="Icon Preview" 
                        className="w-8 h-8"
                      />
                    ) : (
                      <Image className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={iconInputRef}
                      type="file"
                      accept=".svg"
                      className="hidden"
                      onChange={(e) => handleIconChange(e)}
                    />
                    <button
                      type="button"
                      onClick={() => iconInputRef.current?.click()}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                    >
                      {iconFile ? translations?.changeIcon || 'Change Icon' : translations?.uploadIcon || 'Upload Icon'}
                    </button>
                    <p className="text-xs text-gray-500 mt-1">
                      {translations?.svgOnly || 'SVG files only'} ({translations?.maxSizeKb || 'Max 100KB'})
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-4">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 text-white py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
                  style={{ backgroundColor: '#194866' }}
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    translations?.addCategory || 'Add Category'
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200"
                >
                  {translations?.cancel || 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditModal && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-screen overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold mb-6" style={{ color: '#194866' }}>
              {translations?.editCategory || 'Edit Category'}
            </h3>
            <form onSubmit={handleEditCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.englishNameLabel || 'Category Name (English) *'}
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
                  {translations?.arabicNameLabel || 'Category Name (Arabic)'}
                </label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                  style={{ 
                    focusBorderColor: '#194866',
                    focusRingColor: '#194866'
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.descriptionLabel || 'Description (English)'}
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.descriptionLabelAr || 'Description (Arabic)'}
                </label>
                <textarea
                  rows={3}
                  value={formData.descriptionAr}
                  onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                  style={{ 
                    focusBorderColor: '#194866',
                    focusRingColor: '#194866'
                  }}
                />
              </div>

              {/* SVG Icon Preview/Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.categoryIconLabel || 'Category Icon (SVG)'}
                </label>
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <div className="w-12 h-12 border border-gray-300 rounded-md flex items-center justify-center bg-gray-50">
                    {selectedCategory.iconUrl ? (
                      <img 
                        src={selectedCategory.iconUrl} 
                        alt={selectedCategory.name} 
                        className="w-8 h-8"
                      />
                    ) : (
                      <Image className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={editIconInputRef}
                      type="file"
                      accept=".svg"
                      className="hidden"
                      onChange={(e) => handleIconChange(e, true)}
                    />
                    <div className="flex space-x-2 rtl:space-x-reverse">
                      <button
                        type="button"
                        onClick={() => editIconInputRef.current?.click()}
                        disabled={iconLoading}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 focus:outline-none disabled:opacity-50"
                      >
                        {iconLoading ? (
                          <span className="flex items-center space-x-1 rtl:space-x-reverse">
                            <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                            <span>{translations?.uploadingIcon || 'Uploading...'}</span>
                          </span>
                        ) : selectedCategory.iconUrl ? (
                          translations?.changeIcon || 'Change Icon'
                        ) : (
                          translations?.uploadIcon || 'Upload Icon'
                        )}
                      </button>
                      
                      {selectedCategory.iconUrl && (
                        <button
                          type="button"
                          onClick={() => handleRemoveIcon(selectedCategory.id)}
                          disabled={iconLoading}
                          className="px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-all duration-200 focus:outline-none disabled:opacity-50"
                        >
                          {translations?.removeIcon || 'Remove Icon'}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {translations?.svgOnly || 'SVG files only'} ({translations?.maxSizeKb || 'Max 100KB'})
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-4">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    translations?.updateCategory || 'Update Category'
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200"
                >
                  {translations?.cancel || 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Modal */}
      {showDeleteModal && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-4 text-gray-900">
                {translations?.deleteCategoryTitle || 'Delete Category'}
              </h3>
              <p className="text-gray-600 mb-6 text-sm sm:text-base">
                {translations?.confirmDeleteCategory?.replace('{name}', selectedCategory.name) || 
                 `Are you sure you want to delete "${selectedCategory.name}"? This action cannot be undone.`}
              </p>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse">
                <button
                  onClick={handleDeleteCategory}
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    translations?.deleteCategoryButton || 'Delete Category'
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200"
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
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-xl w-full">
            <h3 className="text-lg sm:text-xl font-bold mb-4" style={{ color: '#194866' }}>
              {translations?.bulkUploadCategories || 'Bulk Upload Categories'}
            </h3>
            
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-1">
                  <File className="h-5 w-5 text-blue-500" />
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">{translations?.uploadInstructions || 'Upload Instructions'}</h4>
                  <ul className="mt-2 text-sm text-blue-700 list-disc pl-5">
                    <li className="mt-1">{translations?.useTemplateInstruction || 'Use our Excel template for proper formatting'}</li>
                    <li className="mt-1">{translations?.englishNameRequired || 'English name is required for all categories'}</li>
                    <li className="mt-1">{translations?.duplicatesHandledInstruction || 'Duplicates are determined by English name'}</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <button
                onClick={generateTemplate}
                className="flex items-center space-x-2 rtl:space-x-reverse px-6 py-3 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 w-full justify-center"
              >
                <Download className="h-5 w-5" />
                <span>{translations?.downloadTemplate || 'Download Template'}</span>
              </button>
            </div>
            
            <form onSubmit={handleBulkUpload} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.selectExcelFile || 'Select Excel File'}
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors duration-200 border-gray-300 hover:border-gray-400">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-10 h-10 text-gray-400 mb-3" />
                      {bulkUploadFile ? (
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-900">{bulkUploadFile.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{Math.round(bulkUploadFile.size / 1024)} KB</p>
                        </div>
                      ) : (
                        <>
                          <p className="mb-2 text-sm font-medium text-gray-700">{translations?.clickToUpload || 'Click to upload'}</p>
                          <p className="text-xs text-gray-500">{translations?.acceptedFormats || 'XLS, XLSX (Max 2MB)'}</p>
                        </>
                      )}
                    </div>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept=".xlsx, .xls" 
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>
              
              {parseProgress && (
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center space-x-3 rtl:space-x-reverse">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-700">{parseProgress}</p>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-4">
                <button
                  type="submit"
                  disabled={actionLoading || !bulkUploadFile}
                  className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 rtl:space-x-reverse"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{translations?.uploading || 'Uploading...'}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      <span>{translations?.uploadCategories || 'Upload Categories'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  disabled={actionLoading}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200 disabled:opacity-50"
                >
                  {translations?.cancel || 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;