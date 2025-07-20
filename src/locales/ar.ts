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
import { arReports } from './ar-reports';
import { arNotifications } from './ar-notifications';
import { arTable } from './ar-table';
import { arUserStatus } from './ar-user-status';
import { arSuspendedAccount } from './ar-suspended-account';
import { arReviewForm } from './ar-review-form';
import { arReviewVoting } from './ar-review-voting';
import { arShareReview } from './ar-share-review';
import { arSocialLogin } from './ar-social-login';
import { arCompanyDashboard } from './ar-company-dashboard';
import { arDashboard } from './ar-dashboard';

export const ar = {
  ...arCommon,
  ...arNavigation,
  ...arAuth,
  // Password Reset Page Translations
  resetPassword: 'إعادة تعيين كلمة المرور',
  createNewPassword: 'إنشاء كلمة مرور جديدة لحسابك',
  verifyingLink: 'جاري التحقق من رابط إعادة التعيين...',
  linkError: 'خطأ في الرابط',
  invalidResetLink: 'رابط إعادة تعيين كلمة المرور غير صالح',
  invalidOrExpiredLink: 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد.',
  newPassword: 'كلمة المرور الجديدة',
  confirmNewPassword: 'تأكيد كلمة المرور الجديدة',
  enterNewPassword: 'أدخل كلمة مرور جديدة (6 أحرف على الأقل)',
  confirmPassword: 'تأكيد كلمة المرور',
  goToLogin: 'الذهاب إلى تسجيل الدخول',
  passwordResetSuccess: 'تم إعادة تعيين كلمة المرور بنجاح!',
  passwordResetSuccessDesc: 'تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.',
  passwordResetFailed: 'فشل في إعادة تعيين كلمة المرور. يرجى المحاولة مرة أخرى أو طلب رابط جديد.',
  missingActionCode: 'رمز العملية مفقود',
  cannotEditReview: 'لا يمكن تعديل التقييم',
  cannotDeleteReview: 'لا يمكن حذف التقييم',
  cannotEditAfterReply: 'لا يمكن تعديل التقييمات التي تم الرد عليها من قبل الشركة للحفاظ على سلامة المحادثة',
  cannotDeleteAfterReply: 'لا يمكن حذف التقييمات التي تم الرد عليها من قبل الشركة للحفاظ على سلامة المحادثة',
  repliedReview: 'تم الرد من الشركة',
  noHyperlinksAllowed: 'غير مسموح بالروابط في التقييمات',
  responseFilter: 'ردود الشركة',
  withResponses: 'بردود الشركة',
  withoutResponses: 'بدون ردود',
  allResponses: 'كل التقييمات',
  
  // Email Verification
  verifyingEmail: 'جاري التحقق من بريدك الإلكتروني',
  pleaseWait: 'يرجى الانتظار بينما نتحقق من بريدك الإلكتروني...',
  emailVerified: 'تم التحقق من البريد الإلكتروني!',
  emailVerifiedMessage: 'تم التحقق من بريدك الإلكتروني! يمكنك الآن تسجيل الدخول إلى حسابك.',
  emailVerifiedAutoLogin: 'تم التحقق من بريدك الإلكتروني! نقوم بتسجيل دخولك تلقائياً.',
  signingInNow: 'جاري تسجيل دخولك الآن...',
  loginWithRegisteredAccount: 'تسجيل الدخول بالحساب المسجل',
  verificationFailed: 'فشل التحقق',
  failedToVerifyEmail: 'فشل التحقق من البريد الإلكتروني. قد تكون الرابط منتهي الصلاحية.',
  genericVerificationError: 'تعذر التحقق من بريدك الإلكتروني. يرجى المحاولة مرة أخرى أو طلب رابط تحقق جديد.',
  invalidVerificationLink: 'رابط التحقق غير صالح',
  emailChangeWarning: 'ستحتاج إلى التحقق من عنوان بريدك الإلكتروني الجديد. سيتم إرسال رابط التحقق إلى بريدك الجديد.',
  
  // User status
  active: 'نشط',
  suspended: 'موقوف',
  notActive: 'غير نشط',
  userStatus: 'حالة المستخدم',
  suspendUser: 'إيقاف المستخدم',
  reactivateUser: 'تنشيط المستخدم',
  
  // User status
  accountSuspended: 'حسابك موقوف',
  accountSuspendedMessage: 'تم إيقاف حسابك. يرجى التواصل مع الدعم الفني للمساعدة.',
  accountNotVerified: 'الحساب غير مفعل',
  pleaseVerifyAccountMessage: 'يرجى التحقق من بريدك الإلكتروني لتفعيل حسابك.',
  accountNotVerifiedExplanation: 'إذا لم تجد رسالة التحقق، تحقق من مجلد البريد العشوائي أو اطلب إعادة إرسالها.',
  resendVerification: 'إعادة إرسال رابط التحقق',
  
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
  ...arReports,
  ...arNotifications,
  ...arTable,
  ...arUserStatus,
  ...arSuspendedAccount,
  ...arReviewForm,
  ...arReviewVoting,
  ...arShareReview,
  ...arSocialLogin,
  ...arCompanyDashboard,
  ...arDashboard
};