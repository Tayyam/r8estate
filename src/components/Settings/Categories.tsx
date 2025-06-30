import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Tag, AlertCircle, CheckCircle, Search, Upload, X, Image } from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Category } from '../../types/company';

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
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    description: '',
    descriptionAr: '',
    iconFile: null as File | null
  });
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

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

  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (SVG only)
    if (file.type !== 'image/svg+xml') {
      setError(translations?.invalidFileType || 'Invalid file type. Please upload an SVG file');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Validate file size (max 100KB)
    const maxSize = 100 * 1024; // 100KB
    if (file.size > maxSize) {
      setError(translations?.fileTooLarge || 'File too large. Maximum size is 100KB');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Set the file in form data
    if (isEdit && selectedCategory) {
      setFormData(prev => ({ ...prev, iconFile: file }));
    } else {
      setFormData(prev => ({ ...prev, iconFile: file }));
    }
  };

  // Upload icon to Firebase Storage
  const uploadIcon = async (file: File, categoryId: string): Promise<string> => {
    try {
      setUploadingIcon(true);
      
      // Create a reference to 'category-icons/[categoryId].svg'
      const storageRef = ref(storage, `category-icons/${categoryId}.svg`);
      
      // Upload the file
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading icon:', error);
      throw new Error('Failed to upload icon');
    } finally {
      setUploadingIcon(false);
    }
  };

  // Delete icon from Firebase Storage
  const deleteIcon = async (iconUrl: string) => {
    try {
      // Extract file path from URL
      const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/r8estate-2a516.firebasestorage.app/o/';
      if (iconUrl.startsWith(baseUrl)) {
        const filePath = decodeURIComponent(iconUrl.replace(baseUrl, '').split('?')[0]);
        const storageRef = ref(storage, filePath);
        await deleteObject(storageRef);
      }
    } catch (error) {
      console.error('Error deleting icon:', error);
      // Don't throw error, as we don't want to block category deletion if icon deletion fails
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
      
      // Create category document first to get the ID
      const categoryRef = await addDoc(collection(db, 'categories'), {
        name: formData.name,
        nameAr: formData.nameAr || '',
        description: formData.description || '',
        descriptionAr: formData.descriptionAr || '',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // If there's an icon file, upload it
      if (formData.iconFile) {
        try {
          const iconUrl = await uploadIcon(formData.iconFile, categoryRef.id);
          
          // Update category with icon URL
          await updateDoc(doc(db, 'categories', categoryRef.id), {
            iconUrl: iconUrl
          });
        } catch (iconError) {
          console.error('Error uploading icon:', iconError);
          setError(translations?.failedToUploadIcon || 'Failed to upload icon');
          // Note: We continue with category creation even if icon upload fails
        }
      }

      setSuccess(translations?.categoryCreatedSuccess || 'Category added successfully');
      setFormData({ name: '', nameAr: '', description: '', descriptionAr: '', iconFile: null });
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
      
      const updateData: any = {
        name: formData.name,
        nameAr: formData.nameAr || '',
        description: formData.description || '',
        descriptionAr: formData.descriptionAr || '',
        updatedAt: new Date()
      };

      // If there's an icon file, upload it
      if (formData.iconFile) {
        try {
          // Delete old icon if exists
          if (selectedCategory.iconUrl) {
            await deleteIcon(selectedCategory.iconUrl);
          }
          
          const iconUrl = await uploadIcon(formData.iconFile, selectedCategory.id);
          updateData.iconUrl = iconUrl;
        } catch (iconError) {
          console.error('Error uploading icon:', iconError);
          setError(translations?.failedToUploadIcon || 'Failed to upload icon');
          // Continue with category update even if icon upload fails
        }
      }

      await updateDoc(doc(db, 'categories', selectedCategory.id), updateData);

      setSuccess(translations?.categoryUpdatedSuccess || 'Category updated successfully');
      setFormData({ name: '', nameAr: '', description: '', descriptionAr: '', iconFile: null });
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
      
      // Delete icon if exists
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

  // Handle remove icon
  const handleRemoveIcon = async (categoryId: string, iconUrl: string) => {
    try {
      setActionLoading(true);
      setError('');
      
      // Delete icon from storage
      await deleteIcon(iconUrl);
      
      // Update category document
      await updateDoc(doc(db, 'categories', categoryId), {
        iconUrl: null
      });
      
      // Update local state
      setCategories(categories.map(cat => 
        cat.id === categoryId ? { ...cat, iconUrl: undefined } : cat
      ));
      
      setSuccess(translations?.iconRemovedSuccess || 'Icon removed successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error removing icon:', error);
      setError(translations?.failedToRemoveIcon || 'Failed to remove icon');
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
      descriptionAr: category.descriptionAr || '',
      iconFile: null
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
    setSelectedCategory(null);
    setFormData({ name: '', nameAr: '', description: '', descriptionAr: '', iconFile: null });
    setError('');
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
          <div className="flex items-center">
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
                  <div className="flex-1">
                   {/* Icon Display */}
<div className="flex items-center mb-3">
  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center border border-gray-200 overflow-hidden mr-3">
    {category.iconUrl ? (
      <img 
        src={category.iconUrl} 
        alt={category.name} 
        className="w-8 h-8 object-contain"
      />
    ) : (
      <Tag className="w-6 h-6 text-gray-400" />
    )}
  </div>

                      
                      {/* Icon Actions */}
                      <div className="flex items-center space-x-2">
                        {category.iconUrl ? (
                          <>
                            <button
                              onClick={() => handleRemoveIcon(category.id, category.iconUrl!)}
                              disabled={actionLoading}
                              className="p-1 text-red-500 hover:bg-red-50 rounded-lg text-xs flex items-center"
                              title={translations?.removeIcon || "Remove Icon"}
                            >
                              <X className="w-4 h-4 mr-1" />
                              <span>{translations?.removeIcon || "Remove"}</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedCategory(category);
                              if (fileInputRef.current) {
                                fileInputRef.current.click();
                              }
                            }}
                            disabled={actionLoading || uploadingIcon}
                            className="p-1 text-blue-500 hover:bg-blue-50 rounded-lg text-xs flex items-center"
                            title={translations?.uploadIcon || "Upload Icon"}
                          >
                            <Upload className="w-4 h-4 mr-1" />
                            <span>{translations?.uploadIcon || "Upload"}</span>
                          </button>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".svg,image/svg+xml"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !selectedCategory) return;
                          
                          // Validate file type (SVG only)
                          if (file.type !== 'image/svg+xml') {
                            setError(translations?.invalidFileType || 'Invalid file type. Please upload an SVG file');
                            setTimeout(() => setError(''), 3000);
                            return;
                          }
                          
                          // Validate file size (max 100KB)
                          const maxSize = 100 * 1024; // 100KB
                          if (file.size > maxSize) {
                            setError(translations?.fileTooLarge || 'File too large. Maximum size is 100KB');
                            setTimeout(() => setError(''), 3000);
                            return;
                          }
                          
                          try {
                            setUploadingIcon(true);
                            
                            // Upload icon
                            const iconUrl = await uploadIcon(file, selectedCategory.id);
                            
                            // Update category document
                            await updateDoc(doc(db, 'categories', selectedCategory.id), {
                              iconUrl: iconUrl,
                              updatedAt: new Date()
                            });
                            
                            // Update local state
                            setCategories(categories.map(cat => 
                              cat.id === selectedCategory.id ? { ...cat, iconUrl } : cat
                            ));
                            
                            setSuccess(translations?.iconUploadedSuccess || 'Icon uploaded successfully');
                            setTimeout(() => setSuccess(''), 3000);
                            setSelectedCategory(null);
                          } catch (error) {
                            console.error('Error uploading icon:', error);
                            setError(translations?.failedToUploadIcon || 'Failed to upload icon');
                            setTimeout(() => setError(''), 3000);
                          } finally {
                            setUploadingIcon(false);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }
                        }}
                      />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{category.name}</h3>
                    {category.nameAr && (
                      <p className="text-sm text-gray-600 mb-2">{category.nameAr}</p>
                    )}
                    {category.description && (
                      <p className="text-sm text-gray-600 leading-relaxed">{category.description}</p>
                    )}
                    {category.descriptionAr && (
                      <p className="text-sm text-gray-600 leading-relaxed mt-1">{category.descriptionAr}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 ml-3">
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
                <div className="text-xs text-gray-500">
                  {translations?.createdDate?.replace('{date}', category.createdAt.toLocaleDateString()) || `Created: ${category.createdAt.toLocaleDateString()}`}
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
                <div 
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors duration-200 ${
                    formData.iconFile ? 'border-green-300 bg-green-50' : 'border-gray-300'
                  }`}
                  onClick={() => editFileInputRef.current?.click()}
                >
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept=".svg,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      handleFileChange(e, false);
                    }}
                  />
                  
                  {formData.iconFile ? (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center mb-2 p-2">
                        <img
                          src={URL.createObjectURL(formData.iconFile)}
                          alt="Icon Preview"
                          className="max-w-full max-h-full"
                        />
                      </div>
                      <div className="flex items-center">
                        <span className="text-green-600 text-sm font-medium">{formData.iconFile.name}</span>
                        <button 
                          type="button"
                          className="ml-2 text-red-500 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData(prev => ({ ...prev, iconFile: null }));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">{translations?.dragDropSvg || 'Drag & drop an SVG file here or click to browse'}</p>
                      <p className="text-xs text-gray-400 mt-1">{translations?.svgOnly || 'SVG files only'}</p>
                      <p className="text-xs text-gray-400">{translations?.maxSizeKb || 'Max size: 100KB'}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-4">
                <button
                  type="submit"
                  disabled={actionLoading || uploadingIcon}
                  className="flex-1 text-white py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
                  style={{ backgroundColor: '#194866' }}
                >
                  {actionLoading || uploadingIcon ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : null}
                  <span>
                    {actionLoading 
                      ? (translations?.creatingCategory || 'Creating...')
                      : uploadingIcon
                        ? (translations?.uploadingIcon || 'Uploading icon...')
                        : (translations?.addCategory || 'Add Category')
                    }
                  </span>
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
              
              {/* SVG Icon Edit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.categoryIconLabel || 'Category Icon (SVG)'}
                </label>
                <div className="mb-3">
                  {selectedCategory.iconUrl ? (
                    <div className="flex items-center mb-2">
                      <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 flex items-center justify-center mr-3 p-2">
                        <img
                          src={selectedCategory.iconUrl}
                          alt={selectedCategory.name}
                          className="max-w-full max-h-full"
                        />
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600">{translations?.currentIcon || 'Current icon'}</span>
                        <button 
                          type="button" 
                          className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded-full"
                          onClick={() => {
                            if (selectedCategory.iconUrl) {
                              handleRemoveIcon(selectedCategory.id, selectedCategory.iconUrl);
                            }
                          }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mb-2">{translations?.noIconSet || 'No icon set'}</p>
                  )}
                </div>
                
                <div 
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors duration-200 ${
                    formData.iconFile ? 'border-green-300 bg-green-50' : 'border-gray-300'
                  }`}
                  onClick={() => editFileInputRef.current?.click()}
                >
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept=".svg,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      handleFileChange(e, true);
                    }}
                  />
                  
                  {formData.iconFile ? (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center mb-2 p-2">
                        <img
                          src={URL.createObjectURL(formData.iconFile)}
                          alt="Icon Preview"
                          className="max-w-full max-h-full"
                        />
                      </div>
                      <div className="flex items-center">
                        <span className="text-green-600 text-sm font-medium">{formData.iconFile.name}</span>
                        <button 
                          type="button"
                          className="ml-2 text-red-500 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData(prev => ({ ...prev, iconFile: null }));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        {selectedCategory.iconUrl 
                          ? (translations?.changeIcon || 'Change icon')
                          : (translations?.uploadIcon || 'Upload icon')
                        }
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{translations?.svgOnly || 'SVG files only'}</p>
                      <p className="text-xs text-gray-400">{translations?.maxSizeKb || 'Max size: 100KB'}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-4">
                <button
                  type="submit"
                  disabled={actionLoading || uploadingIcon}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
                >
                  {actionLoading || uploadingIcon ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : null}
                  <span>
                    {actionLoading 
                      ? (translations?.updatingCategory || 'Updating...')
                      : uploadingIcon
                        ? (translations?.uploadingIcon || 'Uploading icon...')
                        : (translations?.updateCategory || 'Update Category')
                    }
                  </span>
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
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : null}
                  <span>
                    {actionLoading 
                      ? (translations?.deletingCategory || 'Deleting...')
                      : (translations?.deleteCategoryButton || 'Delete Category')
                    }
                  </span>
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
    </div>
  );
};

export default Categories;
