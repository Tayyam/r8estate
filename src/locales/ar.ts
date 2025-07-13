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
  claimCompanyDesc: 'طلب ملكية شركة {company}',
  supervisorEmail: 'البريد الإلكتروني للمشرف',
  enterSupervisorEmail: 'أدخل البريد الإلكتروني للمشرف',
  domainMatch: 'تم اكتشاف تطابق نطاق الشركة',
  domainMatchExplanation: 'لقد اكتشفنا أن بريدك الإلكتروني يطابق نطاق الشركة ({domain}). سنرسل رسائل تحقق إلى عناوين البريد الإلكتروني للعمل والمشرف للتحقق من الملكية.',
  domainPrefilledEmail: 'تم ملء البريد الإلكتروني تلقائيًا بناءً على نطاق الشركة',
  verifyAndClaim: 'تحقق واطلب الملكية',
  verificationPending: 'التحقق معلق',
  checkEmailForVerification: 'يرجى التحقق من بريدك الإلكتروني والنقر على رابط التحقق لإكمال طلب ملكية الشركة.',
  tempPasswordInfo: 'كلمة المرور المؤقتة الخاصة بك:',
  passwordKeepSafe: 'يرجى الاحتفاظ بكلمة المرور هذه في مكان آمن. ستحتاجها لتسجيل الدخول بعد التحقق من بريدك الإلكتروني.',
  resendVerification: 'إعادة إرسال بريد التحقق',
  checkStatus: 'التحقق من الحالة',
  emailVerified: 'تم التحقق من البريد الإلكتروني!',
  emailVerifiedDesc: 'تم التحقق من بريدك الإلكتروني. جاري معالجة طلب ملكية الشركة الخاص بك.',
  verificationEmailSent: 'تم إرسال رسالة تحقق! يرجى التحقق من بريدك الإلكتروني للتحقق من عنوان بريدك الإلكتروني. تم إنشاء كلمة مرور مؤقتة: ',
  verificationEmailResent: 'تمت إعادة إرسال رسالة التحقق. يرجى التحقق من صندوق الوارد الخاص بك.',
  failedToSendVerification: 'فشل في إرسال بريد التحقق',
  websiteLabel: 'الموقع الإلكتروني',
  claimRequestSubmitted: 'تم تقديم طلب ملكية الشركة بنجاح! سنراجع طلبك ونتواصل معك قريبًا.',
  domainVerification: 'التحقق من نطاق الشركة',
  domainVerificationQuestion: 'هل لديك عنوان بريد إلكتروني بنطاق الشركة؟',
  yesHaveDomainEmail: 'نعم، لدي بريد إلكتروني مع',
  noDontHaveDomainEmail: 'لا، ليس لدي بريد إلكتروني للشركة',
  domainVerificationNeeded: 'التحقق من النطاق مطلوب',
  enterEmailsWithDomain: 'الرجاء إدخال عناوين بريد إلكتروني تنتهي بـ @{domain}. سيتم استخدام هذه للتحقق من ملكيتك للشركة.',
  emailMustMatchDomain: 'يجب أن يتطابق البريد الإلكتروني مع نطاق الشركة (@{domain})',
  emailNotVerified: 'لم يتم التحقق من البريد الإلكتروني بعد. يرجى التحقق من بريدك الوارد والنقر على رابط التحقق.',
  notLoggedIn: 'غير مسجل الدخول بحساب التحقق. الرجاء تسجيل الدخول باستخدام عنوان البريد الإلكتروني الذي تم إرسال رابط التحقق إليه.',
  verificationCheckFailed: 'فشل التحقق من حالة التحقق',
  businessEmailDomainMismatch: 'يجب أن يتطابق البريد الإلكتروني للعمل مع نطاق الشركة:',
  supervisorEmailDomainMismatch: 'يجب أن يتطابق البريد الإلكتروني للمشرف مع نطاق الشركة:',
  close: 'إغلاق',
  claimCompany: 'المطالبة بالشركة',
  isThisYourCompany: 'هل هذه شركتك؟',
  claimCompanyExplanation: 'إذا كنت المالك أو ممثل هذه الشركة، يمكنك طلب ملكية هذا الملف الشخصي وإدارته مباشرة.',
  sendClaimRequest: 'إرسال طلب ملكية',
  trackClaimRequest: 'تتبع طلب الملكية',
  trackingNumber: 'رقم التتبع',
  enterTrackingNumber: 'أدخل رقم التتبع المكون من 6 أرقام',
  invalidTrackingNumber: 'الرجاء إدخال رقم تتبع صالح مكون من 6 أرقام',
  noRequestFound: 'لم يتم العثور على طلب ملكية بهذا الرقم',
  errorSearchingTracking: 'حدث خطأ أثناء البحث عن طلبك',
  requestDetails: 'تفاصيل الطلب',
  verification: 'التحقق',
  domainVerified: 'تم التحقق من النطاق',
  claimRequestSubmittedWithTracking: 'تم إرسال طلب ملكية الشركة بنجاح! رقم التتبع الخاص بك هو: {tracking}. يرجى الاحتفاظ بهذا الرقم للتحقق من حالة طلبك لاحقًا.',
  foundTrackingNumber: 'وجدنا رقم تتبع محفوظ لطلب الملكية الخاص بك:',
  enterTrackingToCheck: 'إذا كان لديك رقم تتبع من طلب ملكية سابق، يمكنك التحقق من حالته.',
  trackRequest: 'تتبع طلب الملكية',
  enterTrackingDescription: 'أدخل رقم التتبع الخاص بك للتحقق من حالة طلب الملكية',
  companyAlreadyClaimed: 'الشركة مطالب بها بالفعل',
  claimedCompanyExplanation: 'تم المطالبة بملف الشركة هذا بالفعل ويتم إدارته من قبل مالك الشركة أو ممثلها.',
  
  loginToClaimCompany: 'تسجيل الدخول للمطالبة بهذه الشركة',
  emailRequired: 'البريد الإلكتروني مطلوب',
  loginRequired: 'تسجيل الدخول مطلوب',
  confirmCloseClaim: 'هل أنت متأكد أنك تريد الإغلاق؟ سيتم فقدان تقدمك.',
  back: 'رجوع',
  next: 'التالي',
  continueToVerification: 'متابعة للتحقق',
  verifyAndSubmit: 'تحقق وإرسال',
  profilePhoto: 'الصورة الشخصية',
  uploadPhoto: 'رفع صورة',
  changePhoto: 'تغيير الصورة',
  photoSizeLimit: 'الحد الأقصى 2 ميجابايت. JPG أو PNG أو GIF',
  mustBeLoggedIn: 'يجب تسجيل الدخول لإرسال طلب',
  
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
  trackClaimRequest: 'تتبع طلب ملكية الشركة',
  checkRequestStatus: 'تحقق من حالة طلب ملكية الشركة',
  checkStatus: 'تحقق من الحالة',
  
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
  newClaimRequestNotificationMessage: 'تم تقديم طلب ملكية جديد يحتاج إلى مراجعة'
};