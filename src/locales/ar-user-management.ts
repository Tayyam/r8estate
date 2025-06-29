// ترجمات صفحة إدارة المستخدمين
export const arUserManagement = {
  // Page Title and Headers
  userManagement: 'إدارة المستخدمين',
  userManagementDesc: 'إدارة المستخدمين والمشرفين في النظام',
  totalUsers: 'إجمالي المستخدمين: {count}',
  showingUsers: 'عرض {current} من {total} مستخدم',
  
  // User Actions
  addAdmin: 'إضافة مشرف',
  addNewAdmin: 'إضافة مشرف جديد',
  createAdmin: 'إنشاء مشرف',
  deleteUser: 'حذف المستخدم',
  changePassword: 'تغيير كلمة المرور',
  changePasswordFor: 'تغيير كلمة المرور لـ {name}',
  
  // Search and Filter
  searchUsers: 'البحث في المستخدمين...',
  noUsersFound: 'لم يتم العثور على مستخدمين',
  loadingUsers: 'جاري تحميل المستخدمين...',
  
  // User Table Headers
  user: 'المستخدم',
  role: 'الدور',
  createdDate: 'تاريخ الإنشاء',
  actions: 'الإجراءات',
  name: 'الاسم',
  email: 'البريد الإلكتروني',
  
  // User Roles
  admin: 'مشرف',
  userRole: 'مستخدم',
  company: 'شركة',
  administrator: 'مدير',
  
  // Form Fields
  fullName: 'الاسم الكامل',
  emailAddress: 'البريد الإلكتروني',
  password: 'كلمة المرور',
  newPassword: 'كلمة المرور الجديدة',
  enterNewPassword: 'أدخل كلمة مرور جديدة (6 أحرف على الأقل)',
  confirmPassword: 'تأكيد كلمة المرور',
  
  // Form Placeholders
  enterFullName: 'أدخل الاسم الكامل',
  enterEmail: 'أدخل البريد الإلكتروني',
  enterPassword: 'أدخل كلمة المرور',
  
  // Delete Confirmation
  deleteUserTitle: 'حذف المستخدم',
  confirmDeleteUser: 'هل أنت متأكد من أنك تريد حذف {name}؟ هذا الإجراء لا يمكن التراجع عنه وسيؤدي إلى حذف جميع بيانات المستخدم نهائياً.',
  deleteUserButton: 'حذف المستخدم',
  
  // Change Password Modal
  changePasswordTitle: 'تغيير كلمة المرور',
  changePasswordDesc: 'تغيير كلمة المرور لـ {name}',
  newPasswordLabel: 'كلمة المرور الجديدة',
  newPasswordPlaceholder: 'أدخل كلمة مرور جديدة (6 أحرف على الأقل)',
  changePasswordButton: 'تغيير كلمة المرور',
  
  // Action Buttons
  passwordAction: 'كلمة المرور',
  deleteAction: 'حذف',
  
  // Loading States
  creatingAdmin: 'جاري إنشاء المشرف...',
  deletingUser: 'جاري حذف المستخدم...',
  changingPassword: 'جاري تغيير كلمة المرور...',
  
  // Success Messages
  adminCreatedSuccess: 'تم إنشاء المشرف بنجاح',
  userDeletedSuccess: 'تم حذف المستخدم بنجاح',
  passwordChangedSuccess: 'تم تغيير كلمة المرور بنجاح',
  
  // Error Messages
  failedToCreateAdmin: 'فشل في إنشاء المشرف',
  failedToDeleteUser: 'فشل في حذف المستخدم',
  failedToChangePassword: 'فشل في تغيير كلمة المرور',
  failedToLoadUsers: 'فشل في تحميل المستخدمين',
  cannotDeleteYourself: 'لا يمكنك حذف حسابك الخاص',
  
  // Validation Messages
  emailRequired: 'البريد الإلكتروني مطلوب',
  nameRequired: 'الاسم مطلوب',
  passwordRequired: 'كلمة المرور مطلوبة',
  passwordMinLength: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
  invalidEmailFormat: 'تنسيق البريد الإلكتروني غير صالح',
  
  // Empty States
  noUsersMessage: 'لا يوجد مستخدمون في النظام حالياً',
  addFirstUser: 'إضافة أول مستخدم',
};