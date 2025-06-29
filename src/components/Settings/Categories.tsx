import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Tag, AlertCircle, CheckCircle, Search } from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
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
    description: ''
  });

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
    (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
      
      await addDoc(collection(db, 'categories'), {
        name: formData.name,
        nameAr: formData.nameAr || '',
        description: formData.description || '',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      setSuccess(translations?.categoryCreatedSuccess || 'Category added successfully');
      setFormData({ name: '', nameAr: '', description: '' });
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
        updatedAt: new Date()
      });

      setSuccess(translations?.categoryUpdatedSuccess || 'Category updated successfully');
      setFormData({ name: '', nameAr: '', description: '' });
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
      description: category.description || ''
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
    setFormData({ name: '', nameAr: '', description: '' });
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{category.name}</h3>
                    {category.nameAr && (
                      <p className="text-sm text-gray-600 mb-2">{category.nameAr}</p>
                    )}
                    {category.description && (
                      <p className="text-sm text-gray-600 leading-relaxed">{category.description}</p>
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
                  {translations?.createdDate || 'Created'}: {category.createdAt.toLocaleDateString()}
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
                  {translations?.descriptionLabel || 'Description'}
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={translations?.enterCategoryDescription || 'Enter category description'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                  style={{ 
                    focusBorderColor: '#194866',
                    focusRingColor: '#194866'
                  }}
                />
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
                  {translations?.descriptionLabel || 'Description'}
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
    </div>
  );
};

export default Categories;