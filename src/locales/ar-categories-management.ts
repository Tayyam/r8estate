// ترجمات صفحة إدارة الفئات
export const arCategoriesManagement = {
  // Page Title and Headers
  categoryManagement: 'إدارة الفئات',
  categoryManagementDesc: 'إدارة فئات الشركات في المنصة',
  totalCategories: 'إجمالي الفئات: {count}',
  showingCategories: 'عرض {current} من {total} فئة',
  
  // Category Actions
  addCategory: 'إضافة فئة',
  addNewCategory: 'إضافة فئة جديدة',
  createCategory: 'إنشاء فئة',
  editCategory: 'تعديل الفئة',
  deleteCategory: 'حذف الفئة',
  updateCategory: 'تحديث الفئة',
  
  // Search and Filter
  searchCategories: 'البحث في الفئات...',
  noCategoriesFound: 'لم يتم العثور على فئات',
  loadingCategories: 'جاري تحميل الفئات...',
  
  // Category Table Headers
  categoryName: 'اسم الفئة',
  categoryNameAr: 'الاسم بالعربية',
  description: 'الوصف',
  companiesCount: 'عدد الشركات',
  createdDate: 'تاريخ الإنشاء',
  actions: 'الإجراءات',
  
  // Form Fields
  categoryNameEn: 'اسم الفئة (إنجليزي)',
  categoryNameArabic: 'اسم الفئة (عربي)',
  categoryDescription: 'وصف الفئة',
  categoryIcon: 'أيقونة الفئة',
  categoryColor: 'لون الفئة',
  
  // Form Placeholders
  enterCategoryNameEn: 'أدخل اسم الفئة بالإنجليزية',
  enterCategoryNameAr: 'أدخل اسم الفئة بالعربية',
  enterCategoryDescription: 'أدخل وصف الفئة',
  selectCategoryIcon: 'اختر أيقونة الفئة',
  selectCategoryColor: 'اختر لون الفئة',
  
  // Form Labels
  englishNameLabel: 'الاسم الإنجليزي *',
  arabicNameLabel: 'الاسم العربي',
  descriptionLabel: 'الوصف',
  iconLabel: 'الأيقونة',
  colorLabel: 'اللون',
  
  // Category Types (Default Categories)
  realEstateDeveloper: 'مطور عقاري',
  realEstateBroker: 'وسيط عقاري',
  realEstateConsultant: 'مستشار عقاري',
  propertyManagement: 'إدارة الممتلكات',
  construction: 'إنشاءات',
  architecture: 'هندسة معمارية',
  interiorDesign: 'تصميم داخلي',
  realEstateMarketing: 'تسويق عقاري',
  realEstateFinance: 'تمويل عقاري',
  realEstateLegal: 'خدمات قانونية عقارية',
  
  // Action Buttons
  editAction: 'تعديل',
  deleteAction: 'حذف',
  viewDetails: 'عرض التفاصيل',
  
  // Delete Confirmation
  deleteCategoryTitle: 'حذف الفئة',
  confirmDeleteCategory: 'هل أنت متأكد من أنك تريد حذف فئة "{name}"؟ هذا الإجراء لا يمكن التراجع عنه. لاحظ أن الشركات المرتبطة بهذه الفئة ستحتاج إلى فئة جديدة.',
  deleteCategoryButton: 'حذف الفئة',
  categoryHasCompanies: 'هذه الفئة تحتوي على {count} شركة',
  cannotDeleteCategoryWithCompanies: 'لا يمكن حذف فئة تحتوي على شركات. يرجى نقل الشركات إلى فئة أخرى أولاً.',
  
  // Category Details
  categoryDetails: 'تفاصيل الفئة',
  companiesInCategory: 'الشركات في هذه الفئة',
  noCompaniesInCategory: 'لا توجد شركات في هذه الفئة',
  
  // Loading States
  creatingCategory: 'جاري إنشاء الفئة...',
  updatingCategory: 'جاري تحديث الفئة...',
  deletingCategory: 'جاري حذف الفئة...',
  
  // Success Messages
  categoryCreatedSuccess: 'تم إنشاء الفئة بنجاح',
  categoryUpdatedSuccess: 'تم تحديث الفئة بنجاح',
  categoryDeletedSuccess: 'تم حذف الفئة بنجاح',
  
  // Error Messages
  failedToCreateCategory: 'فشل في إنشاء الفئة',
  failedToUpdateCategory: 'فشل في تحديث الفئة',
  failedToDeleteCategory: 'فشل في حذف الفئة',
  failedToLoadCategories: 'فشل في تحميل الفئات',
  categoryAlreadyExists: 'فئة بنفس الاسم موجودة مسبقاً',
  categoryNotFound: 'الفئة غير موجودة',
  
  // Validation Messages
  categoryNameRequired: 'اسم الفئة مطلوب',
  categoryNameMinLength: 'اسم الفئة يجب أن يكون على الأقل حرفين',
  categoryNameMaxLength: 'اسم الفئة يجب أن يكون أقل من 50 حرف',
  descriptionMaxLength: 'الوصف يجب أن يكون أقل من 500 حرف',
  invalidCategoryName: 'اسم الفئة يحتوي على أحرف غير مسموحة',
  
  // Empty States
  noCategoriesMessage: 'لا توجد فئات في النظام حالياً',
  addFirstCategory: 'إضافة أول فئة',
  
  // Category Statistics
  categoriesOverview: 'نظرة عامة على الفئات',
  mostPopularCategory: 'أكثر الفئات شعبية',
  leastPopularCategory: 'أقل الفئات شعبية',
  averageCompaniesPerCategory: 'متوسط الشركات لكل فئة',
  
  // Import/Export
  exportCategories: 'تصدير الفئات',
  importCategories: 'استيراد الفئات',
  downloadCategoriesTemplate: 'تحميل نموذج الفئات',
  
  // Sorting Options
  sortByName: 'ترتيب حسب الاسم',
  sortByDate: 'ترتيب حسب التاريخ',
  sortByCompaniesCount: 'ترتيب حسب عدد الشركات',
  ascending: 'تصاعدي',
  descending: 'تنازلي',
  
  // Bulk Actions
  selectAll: 'تحديد الكل',
  deselectAll: 'إلغاء تحديد الكل',
  selectedCategories: 'فئات محددة: {count}',
  bulkDelete: 'حذف متعدد',
  bulkExport: 'تصدير متعدد',
  
  // Character Count
  charactersRemaining: 'الأحرف المتبقية: {count}',
  charactersUsed: 'الأحرف المستخدمة: {count}',
};