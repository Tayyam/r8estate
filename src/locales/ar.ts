// الملف الرئيسي للترجمة العربية
import { arCommon } from './ar-common';
import { arNavigation } from './ar-navigation';
import { arAuth } from './ar-auth';
import { arHero } from './ar-hero';
import { arCategories } from './ar-categories';
import { arReviews } from './ar-reviews';
import { arAdmin } from './ar-admin';
import { arAbout } from './ar-about';
import { arPricing } from './ar-pricing';
import { arPersonalProfile } from './ar-personal-profile';
import { arAdminSettings } from './ar-admin-settings';
import { arUserManagement } from './ar-user-management';
import { arCompanies } from './ar-companies';
import { arCategoriesManagement } from './ar-categories-management';
import { arCompanyProfile } from './ar-company-profile';
import { arStats } from './ar-stats';
import { arFooter } from './ar-footer';
import { arContact } from './ar-contact';
import { arTerms } from './ar-terms';
import { arPrivacy } from './ar-privacy';
import { arMyReviews } from './ar-my-reviews';
import { arSearch } from './ar-search';
import { arClaimRequests } from './ar-claim-requests';

export const ar = {
  ...arCommon,
  ...arNavigation,
  ...arAuth,
  ...arHero,
  ...arCategories,
  ...arReviews,
  ...arAdmin,
  ...arAbout,
  ...arPricing,
  ...arPersonalProfile,
  ...arAdminSettings,
  ...arUserManagement,
  ...arCompanies,
  ...arCategoriesManagement,
  ...arCompanyProfile,
  ...arStats,
  ...arFooter,
  ...arContact,
  ...arTerms,
  ...arPrivacy,
  ...arMyReviews,
  ...arSearch,
  ...arClaimRequests,
  
  // Table/pagination translations
  filterByRole: 'تصفية حسب الدور',
  allRoles: 'جميع الأدوار',
  adminRole: 'مسؤول',
  userRole: 'مستخدم',
  showingItems: 'عرض {start} إلى {end} من {total} عنصر',
  showingUsers: 'عرض {current} من {total} مستخدم',
  showingCategories: 'عرض {current} من {total} فئة',
  previous: 'السابق',
  next: 'التالي',
  actions: 'الإجراءات',
  noUsersFound: 'لم يتم العثور على مستخدمين',
  adjustSearchCriteriaUsers: 'حاول تعديل معايير البحث أو الفلاتر',
  
  // User status translations
  active: 'نشط',
  suspended: 'موقوف',
  userStatus: 'حالة المستخدم',
  suspendUser: 'إيقاف المستخدم',
  reactivateUser: 'تنشيط المستخدم',
  userSuspendedSuccess: 'تم إيقاف المستخدم بنجاح',
  userActivatedSuccess: 'تم تنشيط المستخدم بنجاح',
  failedToUpdateUserStatus: 'فشل تحديث حالة المستخدم',
  
  // Suspend confirmation
  confirmSuspendUser: 'هل أنت متأكد من رغبتك في إيقاف حساب {name}؟ لن يتمكن من الوصول إلى المنصة حتى يتم إعادة تنشيطه.',
  confirmReactivateUser: 'هل أنت متأكد من رغبتك في إعادة تنشيط حساب {name}؟',
  
  // Suspended account page
  accountSuspended: 'حسابك موقوف',
  accountSuspendedMessage: 'تم إيقاف حسابك. يرجى التواصل مع الدعم الفني للمساعدة.',
  accountSuspendedExplanation: 'إذا كنت تعتقد أن هذا خطأ، يرجى الاتصال بنا مباشرة.',
  contactSupport: 'التواصل مع الدعم الفني',
  
  // Review form specific translations
  communication: 'التواصل',
  valueForMoney: 'القيمة مقابل المال',
  filterReviews: 'تصفية التقييمات',
  filterByRating: 'تصفية حسب التقييم',
  filterByTime: 'تصفية حسب الوقت',
  sortOrder: 'ترتيب العرض',
  allRatings: 'جميع التقييمات',
  allTime: 'كل الأوقات',
  today: 'اليوم',
  yesterday: 'الأمس',
  pastWeek: 'الأسبوع الماضي',
  pastMonth: 'الشهر الماضي',
  pastYear: 'السنة الماضية',
  newestFirst: 'الأحدث أولاً',
  oldestFirst: 'الأقدم أولاً',
  clearFilters: 'مسح التصفية',
  noReviewsMatchFilters: 'لا توجد تقييمات تطابق المرشحات',
  tryAdjustingFilters: 'حاول تعديل المرشحات لرؤية المزيد من التقييمات.',
  showingFilteredReviews: 'عرض {count} من {total} تقييم',
  friendliness: 'اللطافة',
  responsiveness: 'سرعة الاستجابة',
  rateYourExperience: 'قيم تجربتك',
  overallRating: 'التقييم العام',
  postAnonymously: 'نشر بشكل مجهول',
  adminCanSeeIdentity: '(يمكن لمسؤولي المنصة فقط رؤية هويتك)',
  pleaseRateAllCategories: 'يرجى تقييم جميع الفئات',
  alreadyReviewed: 'تم التقييم مسبقاً',
  anonymous: 'مجهول',
  writeReview: 'كتابة تقييم',
  loginToReview: 'يرجى تسجيل الدخول لكتابة تقييم',
  loginToReviewDesc: 'يجب عليك تسجيل الدخول لمشاركة تجربتك مع هذه الشركة',
  anonymousUser: 'مستخدم مجهول',
  signInToReview: 'تسجيل الدخول للكتابة تقييم',
  
  // Review voting translations
  helpful: 'مفيد',
  notHelpful: 'غير مفيد',
  markAsHelpful: 'تحديد كمفيد',
  markAsNotHelpful: 'تحديد كغير مفيد',
  cannotVote: 'لا يمكنك التصويت',
  voteSuccess: 'تم تسجيل تصويتك',
  voteRemoved: 'تم إزالة تصويتك',
  
  // Share review
  share: 'مشاركة',
  shareReview: 'مشاركة هذا التقييم',
  linkCopied: 'تم نسخ الرابط',
  sharedReview: 'تقييم مُشارك',
  reviewLinkCopiedDesc: 'تم نسخ رابط التقييم إلى الحافظة',
  couldNotCopyLink: 'تعذر نسخ الرابط إلى الحافظة',
  
  // Auth error messages
  loginError: 'خطأ في تسجيل الدخول',
  loginErrorDesc: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  tooManyAttempts: 'عدد محاولات تسجيل الدخول كبير، يرجى المحاولة لاحقاً',
  accountDisabled: 'تم تعطيل هذا الحساب',
  networkError: 'خطأ في الشبكة، تحقق من اتصالك بالإنترنت',
  registrationError: 'خطأ في التسجيل',
  registrationErrorDesc: 'فشل في إنشاء الحساب، يرجى المحاولة مرة أخرى',
  emailAlreadyInUse: 'هذا البريد الإلكتروني مستخدم بالفعل',
  invalidEmailFormat: 'يرجى إدخال بريد إلكتروني صحيح',
  passwordTooWeak: 'كلمة المرور ضعيفة جداً، يرجى اختيار كلمة مرور أقوى',
  
  // Terms agreement
  agreeToTerms: 'أوافق على',
  termsOfService: 'شروط الخدمة',
  termsAgreementRequired: 'يجب الموافقة على شروط الخدمة لإنشاء حساب',
  
  // Social login translations
  signInWithGoogle: 'تسجيل الدخول باستخدام جوجل',
  signUpWithGoogle: 'التسجيل باستخدام جوجل',
  orContinueWith: 'أو أكمل باستخدام',
  welcomeToR8Estate: 'مرحبًا بك في R8 Estate! تم إنشاء حسابك وتسجيل دخولك الآن.',
  passwordStrengthGood: 'طول كلمة المرور جيد',
  passwordStrengthWeak: 'كلمة المرور ضعيفة جدًا',
  socialLoginError: 'فشل تسجيل الدخول',
  socialLoginErrorDesc: 'فشل في تسجيل الدخول، يرجى المحاولة مرة أخرى.',
  
  // Return Navigation
  youWillBeRedirected: 'ستتم إعادة توجيهك إلى الصفحة السابقة بعد تسجيل الدخول',
  loginToAccessContent: 'الرجاء تسجيل الدخول',
  loginToContinue: 'الرجاء تسجيل الدخول للاستمرار إلى الصفحة التي تريدها',
  registerToAccessContent: 'قم بإنشاء حساب',
  registerToContinue: 'الرجاء إنشاء حساب للاستمرار إلى الصفحة التي تريدها',
  
  // Claim requests tab
  claimRequests: 'طلبات الملكية',
  
  // Report functionality
  report: 'إبلاغ',
  reportContent: 'الإبلاغ عن المحتوى',
  reportContentDesc: 'الإبلاغ عن محتوى غير لائق أو مضلل',
  reportReason: 'سبب الإبلاغ',
  selectReason: 'اختر سبباً',
  reportReasonSpam: 'محتوى مزعج',
  reportReasonInappropriate: 'محتوى غير لائق',
  reportReasonFake: 'تقييم مزيف',
  reportReasonOffensive: 'محتوى مسيء',
  reportReasonOther: 'سبب آخر',
  additionalDetails: 'تفاصيل إضافية',
  optional: 'اختياري',
  reportDetailsPlaceholder: 'يرجى تقديم أي معلومات إضافية قد تساعدنا على فهم المشكلة...',
  reportGuidelines: 'إرشادات الإبلاغ',
  reportGuidelinesItem1: '• التقارير مجهولة للمستخدمين الآخرين',
  reportGuidelinesItem2: '• سيراجع فريقنا تقريرك خلال 24-48 ساعة',
  reportGuidelinesItem3: '• قد تؤدي التقارير الكاذبة إلى قيود على الحساب',
  submitReport: 'إرسال الإبلاغ',
  reportSubmitted: 'تم إرسال الإبلاغ',
  reportSubmittedDesc: 'شكراً على إبلاغك. سيقوم فريقنا بمراجعته قريباً.',
  failedToSubmitReport: 'فشل في إرسال الإبلاغ. يرجى المحاولة مرة أخرى.',
  
  // Reports Management
  reports: 'البلاغات',
  reportManagement: 'إدارة البلاغات',
  totalReports: 'إجمالي البلاغات: {count}',
  allReports: 'جميع البلاغات',
  pendingReports: 'قيد الانتظار',
  acceptedReports: 'مقبولة',
  rejectedReports: 'مرفوضة',
  searchReports: 'البحث في البلاغات...',
  noReportsFound: 'لم يتم العثور على بلاغات',
  noReportsWithStatus: 'لا توجد بلاغات بحالة {status}',
  noReports: 'لا توجد بلاغات بعد',
  loadingReports: 'جاري تحميل البلاغات...',
  
  // Report Information
  reportInformation: 'معلومات البلاغ',
  reportType: 'نوع المحتوى',
  reportReason: 'سبب البلاغ',
  reportDate: 'تاريخ البلاغ',
  resolvedDate: 'تاريخ الحل',
  reportedContent: 'المحتوى المبلغ عنه',
  contentNotAvailable: 'المحتوى غير متاح',
  reporterComments: 'تعليقات المبلغ',
  adminNotes: 'ملاحظات المسؤول',
  
  // Report Actions
  viewContent: 'عرض المحتوى',
  acceptReport: 'قبول البلاغ',
  rejectReport: 'رفض البلاغ',
  acceptReportTitle: 'قبول البلاغ',
  rejectReportTitle: 'رفض البلاغ',
  acceptReportConfirmation: 'هل أنت متأكد من أنك تريد قبول هذا البلاغ؟ سيؤدي ذلك إلى إزالة المحتوى المبلغ عنه من المنصة.',
  rejectReportConfirmation: 'هل أنت متأكد من أنك تريد رفض هذا البلاغ؟ سيبقى المحتوى المبلغ عنه على المنصة.',
  acceptAndRemove: 'قبول وإزالة المحتوى',
  enterNotesForReport: 'أدخل أي ملاحظات حول هذا البلاغ...',
  
  // Report Status
  reportAcceptedSuccess: 'تم قبول البلاغ وإزالة المحتوى بنجاح',
  reportRejectedSuccess: 'تم رفض البلاغ بنجاح',
  failedToAcceptReport: 'فشل في قبول البلاغ',
  failedToRejectReport: 'فشل في رفض البلاغ',
  failedToLoadReports: 'فشل في تحميل البلاغات',
  
  // Notifications
  notifications: 'الإشعارات',
  allNotifications: 'جميع الإشعارات',
  unread: 'غير مقروءة',
  read: 'مقروءة',
  markAllAsRead: 'تعيين الكل كمقروءة',
  deleteAll: 'حذف الكل',
  noNotifications: 'لا توجد إشعارات',
  noUnreadNotifications: 'لا توجد إشعارات غير مقروءة',
  noReadNotifications: 'لا توجد إشعارات مقروءة',
  notificationsWillAppearHere: 'ستظهر الإشعارات الجديدة هنا أثناء تفاعلك مع المنصة.',
  viewAllNotifications: 'عرض جميع الإشعارات',
  loadingNotifications: 'جاري تحميل الإشعارات...',
  
  // Notification messages
  newReviewNotificationTitle: 'تقييم جديد',
  newReviewNotificationMessage: 'قام {userName} بكتابة تقييم جديد لشركتك',
  
  companyReplyNotificationTitle: 'رد على تقييمك',
  companyReplyNotificationMessage: 'قامت {companyName} بالرد على تقييمك',
  
  adminEditReviewNotificationTitle: 'تم تعديل تقييمك',
  adminEditReviewNotificationMessage: 'قام مشرف بتعديل تقييمك',
  
  adminDeleteReviewNotificationTitle: 'تم حذف تقييمك',
  adminDeleteReviewNotificationMessage: 'قام مشرف بحذف تقييمك بسبب مخالفة المحتوى للشروط',
  
  adminDeleteReplyNotificationTitle: 'تم حذف ردك',
  adminDeleteReplyNotificationMessage: 'قام مشرف بحذف ردك بسبب مخالفة المحتوى للشروط',
  
  reviewVotesNotificationTitle: 'تفاعل مع تقييمك',
  reviewVotesNotificationMessage: 'حصل تقييمك على 5 تصويتات',
  
  // Company Dashboard
  companyDashboard: 'لوحة تحكم الشركة',
  companyDashboardAccessDenied: 'يمكن للحسابات من نوع شركة فقط الوصول إلى لوحة التحكم.',
  companyDashboardNotFound: 'تعذر العثور على الشركة المرتبطة بحسابك.',
  loadingDashboard: 'جاري تحميل لوحة التحكم...',
  viewPublicProfile: 'عرض الملف العام',
  
  // Dashboard Tabs
  overview: 'نظرة عامة',
  reviews: 'التقييمات',
  gallery: 'معرض الصور',
  projects: 'المشاريع',
  profileManagement: 'إدارة الملف الشخصي',
  plan: 'الخطة',
  
  // Overview Tab
  totalReviews: 'إجمالي التقييمات',
  averageRating: 'متوسط التقييم',
  newReviewsThisMonth: 'تقييمات جديدة هذا الشهر',
  responseRate: 'معدل الاستجابة',
  latestReviews: 'أحدث التقييمات',
  needsResponse: 'يحتاج للرد',
  yourReply: 'ردك',
  noReviewsYet: 'لا توجد تقييمات حتى الآن',
  reviewsWillAppearHere: 'ستظهر التقييمات هنا بمجرد أن يترك العملاء ملاحظاتهم.',
  recentActivity: 'النشاط الأخير',
  increase: 'زيادة',
  decrease: 'انخفاض',
  
  // Reviews Tab
  allRatings: 'جميع التقييمات',
  allResponses: 'جميع الردود',
  responded: 'تم الرد',
  notResponded: 'لم يتم الرد',
  newest: 'الأحدث',
  oldest: 'الأقدم',
  highestRating: 'الأعلى تقييماً',
  lowestRating: 'الأقل تقييماً',
  noReviewsFound: 'لم يتم العثور على تقييمات',
  noReviewsMatchFilters: 'لا توجد تقييمات تطابق المرشحات المحددة. حاول تغيير المرشحات أو تحقق لاحقاً من التقييمات الجديدة.',
  
  // Gallery Tab
  uploadGalleryImages: 'رفع صور للمعرض',
  dragDropImages: 'اسحب وأفلت الصور هنا، أو انقر للاستعراض',
  acceptedFormats: 'الصيغ المقبولة: JPG، JPEG، PNG، GIF، WEBP',
  uploadingImages: 'جاري رفع الصور...',
  pleaseWait: 'يرجى الانتظار أثناء معالجة صورك',
  noGalleryImages: 'لا توجد صور في المعرض',
  addImagesToShowcase: 'أضف صوراً لعرض شركتك ومشاريعك وعقاراتك للعملاء المحتملين.',
  imagesUploadedSuccess: 'تم رفع الصور بنجاح',
  imageDeletedSuccess: 'تم حذف الصورة بنجاح',
  failedToLoadGallery: 'فشل في تحميل صور المعرض',
  failedToUploadImages: 'فشل في رفع الصور',
  failedToDeleteImage: 'فشل في حذف الصورة',
  
  // Projects Tab
  manageYourProjects: 'إدارة مشاريعك وعقاراتك',
  propertiesInProject: '{count} عقار في هذا المشروع',
  addFirstProperty: 'إضافة أول عقار',
  addPropertiesToShowcase: 'أضف عقارات لعرض مشاريعك للعملاء المحتملين.',
  
  // Profile Management Tab
  companyImages: 'صور الشركة',
  companyInformation: 'معلومات الشركة',
  companyName: 'اسم الشركة',
  companyEmail: 'البريد الإلكتروني للشركة',
  companyPhone: 'رقم الهاتف',
  companyWebsite: 'الموقع الإلكتروني',
  companyDescription: 'الوصف',
  locationInformation: 'معلومات الموقع',
  contactAdminLocation: 'اتصل بمسؤول لتغيير موقع شركتك',
  uploadLogo: 'رفع شعار',
  changeLogo: 'تغيير الشعار',
  uploadCover: 'رفع صورة غلاف',
  changeCover: 'تغيير الغلاف',
  recommendedSize: 'الحجم الموصى به: 400×400 بكسل',
  recommendedCoverSize: 'الحجم الموصى به: 1200×400 بكسل',
  saveChanges: 'حفظ التغييرات',
  saving: 'جاري الحفظ...',
  profileUpdatedSuccess: 'تم تحديث الملف الشخصي بنجاح',
  failedToUpdateProfile: 'فشل في تحديث الملف الشخصي',
  descriptionInfo: 'سيتم عرض هذا الوصف في ملفك الشخصي العام',
  
  // Plan Tab
  currentPlan: 'الخطة الحالية',
  yourSubscriptionDetails: 'تفاصيل اشتراكك والمزايا',
  activePlan: 'خطة نشطة',
  inactivePlan: 'خطة غير نشطة',
  includedFeatures: 'الميزات المضمنة',
  upgradeToProPlan: 'الترقية إلى الخطة الاحترافية',
  unlockPremiumFeatures: 'افتح الميزات المتميزة وارتق بملف شركتك إلى المستوى التالي',
  upgradeNow: 'الترقية الآن',
  billingHistory: 'سجل الفواتير',
  billingHistoryComingSoon: 'سجل الفواتير وإدارة الفواتير قريباً',
  
  // Dashboard Common
  comingSoon: 'قريباً',
  view: 'عرض',
  filters: 'المرشحات',
  viewAll: 'عرض الكل',
  
  replyVotesNotificationTitle: 'تفاعل مع ردك',
  replyVotesNotificationMessage: 'حصل ردك على 5 تصويتات',
  
  newReportNotificationTitle: 'بلاغ جديد',
  newReportNotificationMessage: 'تم تقديم بلاغ جديد يحتاج إلى مراجعة',
  
  newClaimRequestNotificationTitle: 'طلب ملكية جديد',
  newClaimRequestNotificationMessage: 'تم تقديم طلب ملكية جديد يحتاج إلى مراجعة',
  
  // Claim Company
  claimCompany: 'المطالبة بالشركة',
  isThisYourCompany: 'هل هذه شركتك؟',
  claimCompanyExplanation: 'إذا كنت المالك أو ممثل هذه الشركة، يمكنك طلب ملكية هذا الملف الشخصي وإدارته مباشرة.',
  sendClaimRequest: 'إرسال طلب ملكية',
  companyAlreadyClaimed: 'الشركة مطالب بها بالفعل',
  claimedCompanyExplanation: 'تم المطالبة بملف الشركة هذا بالفعل ويتم إدارته من قبل مالك الشركة أو ممثلها.',
  
  // Company Email Verification
  companyDomainInfo: 'معلومات نطاق الشركة',
  companyDomainSuggestion: 'للتحقق الأسرع، استخدم بريدًا إلكترونيًا من نطاق الشركة: {domain}',
  companyEmailDetected: 'تم اكتشاف بريد إلكتروني للشركة',
  companyEmailMatchDetected: 'تم اكتشاف بريد إلكتروني من نطاق الشركة: {domain}. هذا سيمكن التحقق المبسط.',
  verificationEmailsSent: 'تم إرسال رسائل التحقق',
  verificationEmailsExplanation: 'لقد أرسلنا رسائل تحقق إلى البريد الإلكتروني للأعمال والمشرف. يرجى التحقق من كلا صندوقي البريد والتحقق من عنوان بريد إلكتروني واحد على الأقل للمتابعة.',
  temporaryPassword: 'كلمة المرور المؤقتة',
  tempPasswordExplanation: 'استخدم كلمة المرور المؤقتة هذه لتسجيل الدخول بعد التحقق من بريدك الإلكتروني. سيُطلب منك تغييرها بعد تسجيل الدخول لأول مرة.',
  checkEmailInstruction: 'تحقق من صندوق الوارد والبريد العشوائي',
  clickVerificationLink: 'انقر على رابط التحقق في البريد الإلكتروني',
  loginWithTempPassword: 'سجل الدخول باستخدام كلمة المرور المؤقتة أعلاه',
  passwordCopied: 'تم نسخ كلمة المرور إلى الحافظة',
  copyPassword: 'نسخ كلمة المرور',
  resendVerificationEmails: 'إعادة إرسال رسائل التحقق',
  resendingVerification: 'جاري إعادة الإرسال...',
  emailVerificationNote: 'ملاحظة: ستتم معالجة طلب المطالبة الخاص بك بعد التحقق من البريد الإلكتروني. ستتلقى تأكيدًا عندما تتم الموافقة على مطالبتك.',
  failedToSendVerification: 'فشل في إرسال رسائل التحقق',
  backToForm: 'العودة إلى النموذج',
  closeAndWait: 'إغلاق والانتظار للتحقق',
  
  // Login to claim
  loginToClaimCompany: 'تسجيل الدخول للمطالبة بهذه الشركة',
  loginToClaimDesc: 'يجب عليك تسجيل الدخول أولاً لتتمكن من المطالبة بهذه الشركة',
  
  // Claim form
  claimRequestForm: 'نموذج طلب ملكية الشركة',
  claimFormIntro: 'املأ النموذج أدناه لطلب ملكية هذا الملف الشخصي للشركة. سيقوم فريقنا بمراجعة طلبك والتحقق من ملكيتك.',
  yourName: 'اسمك',
  yourPosition: 'منصبك في الشركة',
  businessEmail: 'البريد الإلكتروني للعمل',
  businessEmailHint: 'يفضل استخدام البريد الإلكتروني الرسمي للشركة',
  businessPhone: 'رقم هاتف العمل',
  businessPhoneHint: 'رقم الهاتف الرسمي للشركة',
  additionalInfo: 'معلومات إضافية',
  additionalInfoPlaceholder: 'أي معلومات إضافية تساعد في التحقق من ملكيتك للشركة...',
  submitClaimRequest: 'إرسال طلب الملكية',
  submittingClaim: 'جاري إرسال الطلب...',
  
  // Claim success
  claimRequestSubmitted: 'تم إرسال طلب الملكية',
  claimRequestSubmittedDesc: 'تم إرسال طلبك بنجاح. سيقوم فريقنا بمراجعته خلال 2-3 أيام عمل وسنتواصل معك عبر البريد الإلكتروني.',
  claimRequestId: 'رقم الطلب: {id}',
  whatHappensNext: 'ماذا يحدث بعد ذلك؟',
  claimStep1: '1. سيراجع فريقنا طلبك والمعلومات المقدمة',
  claimStep2: '2. قد نتواصل معك لطلب مستندات إضافية للتحقق',
  claimStep3: '3. بمجرد الموافقة، ستحصل على حساب شركة لإدارة ملفك الشخصي',
  backToCompany: 'العودة إلى صفحة الشركة',
  
  // Claim errors
  claimRequestFailed: 'فشل في إرسال طلب الملكية',
  claimRequestFailedDesc: 'حدث خطأ أثناء إرسال طلبك. يرجى المحاولة مرة أخرى.',
  alreadyClaimedByYou: 'لقد قمت بالمطالبة بهذه الشركة بالفعل',
  alreadyClaimedByYouDesc: 'لديك طلب ملكية معلق لهذه الشركة. سنتواصل معك عبر البريد الإلكتروني بمجرد مراجعة طلبك.',
  
  // Validation messages
  nameRequired: 'الاسم مطلوب',
  positionRequired: 'المنصب مطلوب',
  businessEmailRequired: 'البريد الإلكتروني للعمل مطلوب',
  businessPhoneRequired: 'رقم هاتف العمل مطلوب',
  invalidBusinessEmail: 'يرجى إدخال بريد إلكتروني صحيح للعمل',
  invalidBusinessPhone: 'يرجى إدخال رقم هاتف صحيح'
};