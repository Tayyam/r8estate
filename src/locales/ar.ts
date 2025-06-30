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
  
  // Review voting translations
  helpful: 'مفيد',
  notHelpful: 'غير مفيد',
  markAsHelpful: 'تحديد كمفيد',
  markAsNotHelpful: 'تحديد كغير مفيد',
  cannotVote: 'لا يمكنك التصويت',
  voteSuccess: 'تم تسجيل تصويتك',
  voteRemoved: 'تم إزالة تصويتك',
  
  // Social login translations
  signInWithGoogle: 'تسجيل الدخول باستخدام جوجل',
  signInWithFacebook: 'تسجيل الدخول باستخدام فيسبوك',
  signUpWithGoogle: 'التسجيل باستخدام جوجل',
  signUpWithFacebook: 'التسجيل باستخدام فيسبوك',
  orContinueWith: 'أو أكمل باستخدام',
  welcomeToR8Estate: 'مرحبًا بك في R8 Estate! تم إنشاء حسابك وتسجيل دخولك الآن.',
  passwordStrengthGood: 'طول كلمة المرور جيد',
  passwordStrengthWeak: 'كلمة المرور ضعيفة جدًا',
  socialLoginError: 'فشل تسجيل الدخول',
  socialLoginErrorDesc: 'فشل في تسجيل الدخول باستخدام هذه الطريقة، يرجى المحاولة مرة أخرى.'
};