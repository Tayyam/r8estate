// ترجمات صفحة إدارة الشركات
export const arCompanies = {
  // Page Title and Headers
  companyManagement: 'إدارة الشركات',
  companyManagementDesc: 'إدارة الشركات المسجلة في المنصة',
  totalCompanies: 'إجمالي الشركات: {count}',
  showingCompanies: 'عرض {current} من {total} شركة',
  
  // Company Actions
  addCompany: 'إضافة شركة',
  addNewCompany: 'إضافة شركة جديدة',
  createCompany: 'إنشاء شركة',
  editCompany: 'تعديل الشركة',
  deleteCompany: 'حذف الشركة',
  viewCompanyProfile: 'عرض ملف الشركة',
  
  // Bulk Actions
  bulkUpload: 'رفع جماعي',
  downloadTemplate: 'تحميل النموذج',
  uploadExcel: 'رفع ملف Excel',
  bulkUploadCompanies: 'رفع شركات متعددة',
  selectExcelFile: 'اختر ملف Excel',
  
  // Search and Filter
  searchCompanies: 'البحث في الشركات...',
  filterByCategory: 'تصفية حسب الفئة',
  filterByLocation: 'تصفية حسب الموقع',
  filterByStatus: 'تصفية حسب الحالة',
  allCategories: 'جميع الفئات',
  allLocations: 'جميع المواقع',
  allStatuses: 'جميع الحالات',
  noCompaniesFound: 'لم يتم العثور على شركات',
  loadingCompanies: 'جاري تحميل الشركات...',
  
  // Company Table Headers
  company: 'الشركة',
  category: 'الفئة',
  location: 'الموقع',
  status: 'الحالة',
  verified: 'التحقق',
  rating: 'التقييم',
  reviews: 'التقييمات',
  createdDate: 'تاريخ الإنشاء',
  actions: 'الإجراءات',
  
  // Company Status
  active: 'نشط',
  inactive: 'غير نشط',
  pending: 'في الانتظار',
  suspended: 'معلق',
  verifiedStatus: 'محقق',
  unverifiedStatus: 'غير محقق',
  
  // Form Fields
  companyName: 'اسم الشركة',
  companyEmail: 'بريد الشركة الإلكتروني',
  companyPassword: 'كلمة مرور الشركة',
  companyCategory: 'فئة الشركة',
  companyLocation: 'موقع الشركة',
  companyDescription: 'وصف الشركة',
  companyPhone: 'هاتف الشركة',
  companyWebsite: 'موقع الشركة الإلكتروني',
  companyLogo: 'شعار الشركة',
  
  // Form Placeholders
  enterCompanyName: 'أدخل اسم الشركة',
  enterCompanyEmail: 'أدخل بريد الشركة الإلكتروني',
  enterCompanyPassword: 'أدخل كلمة مرور الشركة',
  selectCategory: 'اختر الفئة',
  selectLocation: 'اختر الموقع',
  enterDescription: 'أدخل وصف الشركة',
  enterPhone: 'أدخل رقم الهاتف',
  enterWebsite: 'أدخل الموقع الإلكتروني',
  
  // Action Buttons
  viewProfile: 'عرض الملف',
  editProfile: 'تعديل الملف',
  deleteProfile: 'حذف الملف',
  verifyCompany: 'تحقق من الشركة',
  unverifyCompany: 'إلغاء التحقق',
  activateCompany: 'تفعيل الشركة',
  deactivateCompany: 'إلغاء تفعيل الشركة',
  
  // Delete Confirmation
  deleteCompanyTitle: 'حذف الشركة',
  confirmDeleteCompany: 'هل أنت متأكد من أنك تريد حذف شركة "{name}"؟ هذا الإجراء لا يمكن التراجع عنه وسيؤدي إلى حذف جميع بيانات الشركة والعقارات والتقييمات المرتبطة بها نهائياً.',
  deleteCompanyButton: 'حذف الشركة',
  
  // Bulk Upload
  bulkUploadTitle: 'رفع شركات متعددة',
  bulkUploadDesc: 'رفع عدة شركات باستخدام ملف Excel',
  downloadTemplateDesc: 'قم بتحميل نموذج Excel لملء بيانات الشركات',
  uploadInstructions: 'اختر ملف Excel يحتوي على بيانات الشركات',
  uploadInProgress: 'جاري رفع الشركات...',
  processingFile: 'جاري معالجة الملف...',
  validatingData: 'جاري التحقق من البيانات...',
  
  // Bulk Upload Results
  uploadCompleted: 'تم رفع الشركات بنجاح',
  companiesUploaded: 'تم رفع {count} شركة بنجاح',
  someCompaniesSkipped: 'تم تخطي {count} شركة بسبب أخطاء',
  uploadFailed: 'فشل في رفع الشركات',
  invalidFileFormat: 'تنسيق الملف غير صالح. يرجى استخدام ملف Excel',
  fileProcessingError: 'خطأ في معالجة الملف',
  
  // Loading States
  creatingCompany: 'جاري إنشاء الشركة...',
  updatingCompany: 'جاري تحديث الشركة...',
  deletingCompany: 'جاري حذف الشركة...',
  uploadingLogo: 'جاري رفع الشعار...',
  
  // Success Messages
  companyCreatedSuccess: 'تم إنشاء الشركة بنجاح',
  companyUpdatedSuccess: 'تم تحديث الشركة بنجاح',
  companyDeletedSuccess: 'تم حذف الشركة بنجاح',
  companyVerifiedSuccess: 'تم التحقق من الشركة بنجاح',
  companyUnverifiedSuccess: 'تم إلغاء التحقق من الشركة',
  logoUploadedSuccess: 'تم رفع الشعار بنجاح',
  
  // Error Messages
  failedToCreateCompany: 'فشل في إنشاء الشركة',
  failedToUpdateCompany: 'فشل في تحديث الشركة',
  failedToDeleteCompany: 'فشل في حذف الشركة',
  failedToLoadCompanies: 'فشل في تحميل الشركات',
  failedToUploadLogo: 'فشل في رفع الشعار',
  emailAlreadyExists: 'البريد الإلكتروني موجود مسبقاً',
  companyNotFound: 'الشركة غير موجودة',
  
  // Validation Messages
  companyNameRequired: 'اسم الشركة مطلوب',
  companyEmailRequired: 'بريد الشركة الإلكتروني مطلوب',
  companyPasswordRequired: 'كلمة مرور الشركة مطلوبة',
  categoryRequired: 'الفئة مطلوبة',
  locationRequired: 'الموقع مطلوب',
  invalidEmailFormat: 'تنسيق البريد الإلكتروني غير صالح',
  passwordMinLength: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
  invalidWebsiteUrl: 'رابط الموقع الإلكتروني غير صالح',
  invalidPhoneNumber: 'رقم الهاتف غير صالح',
  
  // Empty States
  noCompaniesMessage: 'لا توجد شركات مسجلة في المنصة حالياً',
  addFirstCompany: 'إضافة أول شركة',
  
  // File Upload
  chooseFile: 'اختر ملف',
  fileSelected: 'تم اختيار الملف',
  maxFileSize: 'الحد الأقصى لحجم الملف: 5MB',
  allowedFormats: 'التنسيقات المسموحة: PNG, JPG, JPEG',
  
  // Quick Stats
  totalActiveCompanies: 'الشركات النشطة',
  totalVerifiedCompanies: 'الشركات المحققة',
  totalPendingCompanies: 'الشركات في الانتظار',
  averageRating: 'متوسط التقييم',
};