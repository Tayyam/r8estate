// Add to src/locales/ar-categories-management.ts or update existing file
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
  
  // Search and Filter
  searchCategories: 'البحث في الفئات...',
  noCategoriesFound: 'لم يتم العثور على فئات',
  loadingCategories: 'جاري تحميل الفئات...',
  
  // Form Fields
  englishNameLabel: 'اسم الفئة (الإنجليزية) *',
  arabicNameLabel: 'اسم الفئة (العربية)',
  descriptionLabel: 'الوصف (الإنجليزية)',
  descriptionLabelAr: 'الوصف (العربية)',
  categoryIconLabel: 'أيقونة الفئة (SVG)',
  
  // Form Placeholders
  enterCategoryNameEn: 'أدخل اسم الفئة بالإنجليزية',
  enterCategoryNameAr: 'أدخل اسم الفئة بالعربية',
  enterCategoryDescription: 'أدخل وصف الفئة بالإنجليزية',
  enterCategoryDescriptionAr: 'أدخل وصف الفئة بالعربية',
  
  // Delete Confirmation
  deleteCategoryTitle: 'حذف الفئة',
  confirmDeleteCategory: 'هل أنت متأكد من أنك تريد حذف "{name}"؟ هذا الإجراء لا يمكن التراجع عنه.',
  deleteCategoryButton: 'حذف الفئة',
  
  // Loading States
  creatingCategory: 'جاري إنشاء الفئة...',
  updatingCategory: 'جاري تحديث الفئة...',
  deletingCategory: 'جاري حذف الفئة...',
  
  // Success Messages
  categoryCreatedSuccess: 'تم إنشاء الفئة بنجاح',
  categoryUpdatedSuccess: 'تم تحديث الفئة بنجاح',
  categoryDeletedSuccess: 'تم حذف الفئة بنجاح',
  iconUploadedSuccess: 'تم رفع الأيقونة بنجاح',
  
  // Error Messages
  failedToCreateCategory: 'فشل في إنشاء الفئة',
  failedToUpdateCategory: 'فشل في تحديث الفئة',
  failedToDeleteCategory: 'فشل في حذف الفئة',
  failedToLoadCategories: 'فشل في تحميل الفئات',
  failedToUploadIcon: 'فشل في رفع الأيقونة',
  
  // Validation Messages
  categoryNameRequired: 'اسم الفئة مطلوب',
  invalidFileType: 'نوع الملف غير صالح. يرجى رفع ملف SVG',
  fileTooLarge: 'حجم الملف كبير جداً. الحد الأقصى هو 100 كيلوبايت',
  
  // Empty States
  noCategoriesMessage: 'لا توجد فئات في النظام حالياً',
  addFirstCategory: 'إضافة أول فئة',
  
  // SVG Icon Upload
  uploadIcon: 'رفع أيقونة',
  changeIcon: 'تغيير الأيقونة',
  removeIcon: 'إزالة الأيقونة',
  dragDropSvg: 'اسحب وأفلت ملف SVG هنا أو انقر للاختيار',
  svgOnly: 'ملفات SVG فقط',
  maxSizeKb: 'الحد الأقصى: 100 كيلوبايت',
  uploadingIcon: 'جاري رفع الأيقونة...',
  
  // Time and Date
  createdDate: 'تاريخ الإنشاء',
  
  // Bulk Upload
  bulkUpload: 'رفع جماعي',
  bulkUploadCategories: 'رفع فئات متعددة',
  downloadTemplate: 'تحميل النموذج',
  selectExcelFile: 'اختر ملف Excel',
  uploadCategories: 'رفع الفئات',
  uploading: 'جاري الرفع...',
  processingFile: 'جاري معالجة الملف...',
  validatingData: 'جاري التحقق من البيانات...',
  addingCategories: 'جاري إضافة الفئات...',
  
  // Bulk Upload Instructions
  uploadInstructions: 'تعليمات الرفع',
  useTemplateInstruction: 'استخدم نموذج Excel للتنسيق الصحيح',
  englishNameRequired: 'الاسم الإنجليزي مطلوب لجميع الفئات',
  duplicatesHandledInstruction: 'يتم تحديد التكرارات بواسطة الاسم الإنجليزي',
  
  // Bulk Upload Results
  categoriesAddedSuccess: 'تم إضافة {count} فئة بنجاح',
  someEntriesFailed: 'فشل في إضافة {count} فئة. تحقق من وحدة التحكم للتفاصيل.',
  noValidCategories: 'لم يتم العثور على فئات صالحة في الملف',
  noDataInFile: 'لا توجد بيانات في الملف',
  excelParseError: 'خطأ في معالجة ملف Excel. يرجى التحقق من التنسيق.',
  fileReadError: 'خطأ في قراءة الملف',
  uploadFailed: 'فشل في رفع الفئات',
  templateDownloadedSuccess: 'تم تنزيل النموذج بنجاح',
  failedToGenerateTemplate: 'فشل في إنشاء النموذج',
  
  // File Upload
  clickToUpload: 'انقر للرفع',
  acceptedFormats: 'XLS, XLSX (الحد الأقصى 2MB)'
};