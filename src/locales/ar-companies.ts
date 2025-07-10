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
  claimCompany: 'إسناد حساب',
  unclaimCompany: 'إزالة الحساب',
  claim: 'إسناد',
  unclaim: 'إزالة',
  
  // Claim/Unclaim
  createCompanyAccount: 'إنشاء حساب للشركة',
  createAccountDesc: 'السماح لهذه الشركة بتسجيل الدخول وإدارة ملفها الشخصي',
  claimed: 'مُسند',
  notClaimed: 'غير مُسند',
  unclaimed: 'غير مُسند',
  claimStatus: 'حالة الإسناد',
  claimedCompanyDesc: 'الشركة المُسندة لها حساب مستخدم يدير ملفها الشخصي',
  notClaimedCompanyDesc: 'الشركة غير المُسندة ليس لديها حساب مستخدم',
  claimedCompanyExplanation: 'هذه الشركة يديرها حساب مستخدم',
  notClaimedCompanyExplanation: 'هذه الشركة ليس لديها حساب مستخدم بعد',
  aboutClaimingCompany: 'حول إسناد الشركة',
  
  // Company users management
  manageUsers: 'إدارة المستخدمين',
  manageCompanyUsers: 'إدارة مستخدمي الشركة',
  companyUsers: 'مستخدمو الشركة',
  addUser: 'إضافة مستخدم',
  addFirstUser: 'إضافة أول مستخدم',
  addNewCompanyUser: 'إضافة مستخدم جديد للشركة',
  noCompanyUsers: 'لا يوجد مستخدمون لهذه الشركة بعد',
  noUsersMatchSearch: 'لا يوجد مستخدمون يطابقون بحثك',
  removeUser: 'إزالة المستخدم',
  companyUserAdded: 'تمت إضافة مستخدم الشركة بنجاح',
  companyUserAddedAndClaimed: 'تمت إضافة المستخدم وتم تعيين الشركة كمُسندة بنجاح',
  companyUserRemoved: 'تمت إزالة مستخدم الشركة بنجاح',
  lastCompanyUserRemoved: 'تمت إزالة آخر مستخدم للشركة بنجاح',
  failedToAddUser: 'فشل في إضافة مستخدم الشركة',
  failedToDeleteUser: 'فشل في حذف مستخدم الشركة',
  failedToLoadUsers: 'فشل في تحميل مستخدمي الشركة',
  searchUsers: 'البحث في المستخدمين...',
  users: 'المستخدمين',
  claimingCompanyDesc: 'سيؤدي إسناد شركة إلى إنشاء حساب مستخدم يرتبط بملف هذه الشركة. سيتمكن المستخدم من إدارة ملف الشركة والرد على التقييمات.',
  confirmClaimCompany: 'هل أنت متأكد من أنك تريد إسناد شركة "{name}"؟ سيتم إنشاء حساب مستخدم مرتبط بملف هذه الشركة.',
  confirmUnclaimCompany: 'هل أنت متأكد من أنك تريد إزالة إسناد "{name}"؟ سيؤدي ذلك إلى إزالة حساب المستخدم المرتبط بملف هذه الشركة.',
  companyIsClaimed: 'الشركة مُسندة',
  
  // Claim/Unclaim Warnings
  importantNote: 'ملاحظة مهمة',
  unclaimWarning1: 'سيتم حذف حساب المستخدم من قاعدة البيانات',
  unclaimWarning2: 'لن تتمكن الشركة من الوصول للدخول بعد الآن',
  unclaimWarning3: 'ستظل جميع بيانات الشركة والتقييمات سليمة',
  claimedCompanyInfo: 'هذه الشركة تمتلك حساب مستخدم',
  
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
  createdDate: 'تاريخ الإنشاء',
  updatedDate: 'تاريخ التحديث',
  actions: 'الإجراءات',
  
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
  claimStatus: 'حالة الإسناد',
  
  // Form Placeholders
  enterCompanyName: 'أدخل اسم الشركة',
  enterCompanyEmail: 'أدخل بريد الشركة الإلكتروني',
  enterCompanyPassword: 'أدخل كلمة مرور الشركة (6 أحرف على الأقل)',
  selectCategory: 'اختر الفئة',
  selectLocation: 'اختر الموقع',
  enterDescription: 'أدخل وصف الشركة',
  enterPhone: 'أدخل رقم الهاتف',
  enterWebsite: 'أدخل الموقع الإلكتروني',
  
  // Email and Password Fields
  email: 'البريد الإلكتروني',
  password: 'كلمة المرور',
  confirmPassword: 'تأكيد كلمة المرور',
  enterEmail: 'أدخل عنوان البريد الإلكتروني',
  enterPassword: 'أدخل كلمة المرور (6 أحرف على الأقل)',
  passwordsDoNotMatch: 'كلمتا المرور غير متطابقتين',
  emailPasswordRequired: 'البريد الإلكتروني وكلمة المرور مطلوبان عند إنشاء حساب',
  emailPasswordOptional: 'البريد الإلكتروني وكلمة المرور اختياريان',
  emailPasswordExplained: 'إذا تم توفير البريد الإلكتروني وكلمة المرور، سيتم إنشاء حساب مستخدم (شركة مُسندة)',
  withoutEmailPassword: 'الشركات بدون بريد إلكتروني وكلمة مرور سيتم تمييزها كـ "غير مُسندة"',
  
  // Action Buttons
  claimCompanyButton: 'إسناد الشركة',
  unclaimCompanyButton: 'إزالة إسناد الشركة',
  deleteCompanyButton: 'حذف الشركة',
  
  // Delete Confirmation
  deleteCompanyTitle: 'حذف الشركة',
  confirmDeleteCompany: 'هل أنت متأكد من أنك تريد حذف شركة "{name}"؟ هذا الإجراء لا يمكن التراجع عنه وسيؤدي إلى حذف جميع بيانات الشركة والعقارات والتقييمات المرتبطة بها نهائياً.',
  
  // Bulk Upload Instructions
  uploadInstructions: 'تعليمات الرفع',
  downloadTemplateFirst: 'قم بتحميل النموذج وملء بيانات الشركات',
  companyNameLocationRequired: 'اسم الشركة والفئة والموقع مطلوبة',
  requiredFields: 'الحقول المطلوبة: الاسم، الفئة، والموقع',
  passwordRequirements: 'كلمات المرور يجب أن تكون 6 أحرف على الأقل',
  emailMustBeUnique: 'يجب أن يكون كل عنوان بريد إلكتروني فريدًا',
  
  // Bulk Upload Results
  uploadCompleted: 'اكتمل الرفع',
  companiesUploaded: 'تم رفع {count} شركة بنجاح',
  companiesUploadedWithErrors: 'تم رفع {success} شركة بنجاح، فشل {error}',
  successfulUploads: 'ناجحة',
  failedUploads: 'فاشلة',
  
  // Loading States
  creatingCompany: 'جاري إنشاء الشركة...',
  updatingCompany: 'جاري تحديث الشركة...',
  deletingCompany: 'جاري حذف الشركة...',
  uploadingLogo: 'جاري رفع الشعار...',
  claiming: 'جاري الإسناد...',
  unclaimingCompany: 'جاري إزالة الإسناد...',
  
  // Success Messages
  companyCreatedSuccess: 'تم إنشاء الشركة بنجاح',
  companyUpdatedSuccess: 'تم تحديث الشركة بنجاح',
  companyDeletedSuccess: 'تم حذف الشركة بنجاح',
  companyClaimedSuccess: 'تم إسناد الشركة بنجاح',
  companyUnclaimedSuccess: 'تم إزالة إسناد الشركة بنجاح',
  templateDownloadedSuccess: 'تم تنزيل النموذج بنجاح',
  
  // Error Messages
  failedToCreateCompany: 'فشل في إنشاء الشركة',
  failedToUpdateCompany: 'فشل في تحديث الشركة',
  failedToDeleteCompany: 'فشل في حذف الشركة',
  failedToLoadCompanies: 'فشل في تحميل الشركات',
  failedToClaimCompany: 'فشل في إسناد الشركة',
  failedToUnclaimCompany: 'فشل في إزالة إسناد الشركة',
  failedToGenerateTemplate: 'فشل في إنشاء النموذج',
  emailAlreadyExists: 'عنوان البريد الإلكتروني مستخدم بالفعل من قبل حساب آخر',
  emailAlreadyInUse: 'عنوان البريد الإلكتروني مستخدم بالفعل',
  
  // Validation Messages
  fillAllRequiredFields: 'يرجى ملء جميع الحقول المطلوبة',
  fillAllFields: 'يرجى ملء جميع الحقول',
  invalidEmailFormat: 'يرجى إدخال بريد إلكتروني صالح',
  passwordMinLength: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
  passwordTooShort: 'كلمة المرور قصيرة جداً (6 أحرف على الأقل)',
  invalidFileType: 'نوع ملف غير صالح. يرجى رفع ملف صورة (JPEG, PNG, GIF)',
  fileTooLarge: 'حجم الملف كبير جداً. يرجى رفع صورة أصغر من 5MB',
  
  // File Upload
  dragDropLogo: 'اسحب وأفلت الشعار هنا، أو انقر للاستعراض',
  allowedFormats: 'التنسيقات المسموحة: PNG, JPG, GIF',
  maxFileSize: 'الحد الأقصى 5MB',
  currentLogo: 'الشعار الحالي',
  uploadLogo: 'رفع شعار جديد',
  changeLogo: 'تغيير الشعار',
  removeLogo: 'إزالة الشعار',
  undoRemoveLogo: 'التراجع عن إزالة الشعار',
  
  // Bulk Upload File Handling
  dragDropFile: 'اسحب وأفلت ملفك هنا',
  orClickToBrowse: 'أو انقر للاستعراض',
  excelOnly: 'ملفات Excel فقط (.xls, .xlsx)',
  maxSizeMb: 'الحد الأقصى 5MB',
  fileSelected: 'تم اختيار الملف',
  removeFile: 'إزالة الملف',
  noFileSelected: 'لم يتم اختيار ملف',
  
  // Misc
  contactInformation: 'معلومات الاتصال',
  noDescriptionAvailable: 'لا يوجد وصف متاح.',
  emailCannotBeChanged: 'لا يمكن تغيير عنوان البريد الإلكتروني',
  processingCompany: 'معالجة الشركة',
  uploading: 'جاري الرفع...',
  
  // Results View
  showingResults: 'عرض {start}-{end} من {total} نتيجة',
};