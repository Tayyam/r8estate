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
  registerToContinue: 'الرجاء إنشاء حساب للاستمرار إلى الصفحة التي تريدها'
};