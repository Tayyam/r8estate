import React from 'react';
import { Shield, Lock, Eye, Database, UserCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface PrivacyProps {
  onNavigate: (page: string) => void;
}

const Privacy: React.FC<PrivacyProps> = ({ onNavigate }) => {
  const { translations, language } = useLanguage();

  const text = {
    ar: {
      title: translations?.privacyPolicyTitle || 'سياسة الخصوصية',
      lastUpdated: translations?.lastUpdated || 'آخر تحديث: 15 ديسمبر 2024',
      section1Title: translations?.informationWeCollect || '1. المعلومات التي نجمعها',
      section2Title: translations?.howWeUseInformation || '2. كيفية استخدام المعلومات',
      section3Title: translations?.informationSharing || '3. مشاركة المعلومات',
      section4Title: translations?.dataSecurity || '4. أمان البيانات',
      section5Title: translations?.cookies || '5. ملفات تعريف الارتباط',
      section6Title: translations?.yourRights || '6. حقوقك',
      section7Title: translations?.dataRetention || '7. الاحتفاظ بالبيانات',
      section8Title: translations?.policyChanges || '8. التغييرات على السياسة',
      section9Title: translations?.contactUs || '9. اتصل بنا',
      commitmentTitle: translations?.ourCommitment || 'التزامنا بخصوصيتك',
      commitmentText: translations?.commitmentText || 'نحن ملتزمون بحماية خصوصيتك وأمان بياناتك الشخصية. هذه السياسة توضح كيفية جمع واستخدام وحماية معلوماتك.'
    },
    en: {
      title: 'Privacy Policy',
      lastUpdated: 'Last Updated: December 15, 2024',
      section1Title: '1. Information We Collect',
      section2Title: '2. How We Use Information',
      section3Title: '3. Information Sharing',
      section4Title: '4. Data Security',
      section5Title: '5. Cookies',
      section6Title: '6. Your Rights',
      section7Title: '7. Data Retention',
      section8Title: '8. Policy Changes',
      section9Title: '9. Contact Us',
      commitmentTitle: 'Our Commitment to Your Privacy',
      commitmentText: 'We are committed to protecting your privacy and the security of your personal data. This policy explains how we collect, use, and protect your information.'
    }
  };

  const loremText = language === 'ar' 
    ? 'هذا النص هو مثال لنص يمكن أن يستبدل في نفس المساحة، لقد تم توليد هذا النص من مولد النص العربى، حيث يمكنك أن تولد مثل هذا النص أو العديد من النصوص الأخرى إضافة إلى زيادة عدد الحروف التى يولدها التطبيق. إذا كنت تحتاج إلى عدد أكبر من الفقرات يتيح لك مولد النص العربى زيادة عدد الفقرات كما تريد، النص لن يبدو مقسما ولا يحوي أخطاء لغوية، مولد النص العربى مفيد لمصممي المواقع على وجه الخصوص، حيث يحتاج العميل فى كثير من الأحيان أن يطلع على صورة حقيقية لتصميم الموقع.'
    : 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

  const sections = [
    { title: text[language].section1Title, content: loremText, icon: Database },
    { title: text[language].section2Title, content: loremText, icon: Eye },
    { title: text[language].section3Title, content: loremText, icon: UserCheck },
    { title: text[language].section4Title, content: loremText, icon: Lock },
    { title: text[language].section5Title, content: loremText, icon: Database },
    { title: text[language].section6Title, content: loremText, icon: UserCheck },
    { title: text[language].section7Title, content: loremText, icon: Database },
    { title: text[language].section8Title, content: loremText, icon: Eye },
    { title: text[language].section9Title, content: loremText, icon: Shield }
  ];

  return (
    <div className={`min-h-screen bg-gray-50 ${language === 'ar' ? 'rtl' : 'ltr'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-8 hover:shadow-lg transition-shadow duration-300">
              <Shield className="h-10 w-10" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight" style={{ color: '#194866' }}>
              {text[language].title}
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              {text[language].lastUpdated}
            </p>
            <div className="w-24 h-1 mx-auto rounded-full" style={{ backgroundColor: '#194866' }}></div>
          </div>
        </div>
      </section>

      {/* Commitment Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-6">
              <Lock className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#194866' }}>
              {text[language].commitmentTitle}
            </h2>
            <p className="text-gray-700 leading-relaxed text-lg">
              {text[language].commitmentText}
            </p>
          </div>
        </div>
      </section>

      {/* Privacy Content */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {sections.map((section, index) => {
              const IconComponent = section.icon;
              return (
                <div key={index} className="bg-white rounded-xl p-8 transition-all duration-300 hover:shadow-lg border border-gray-100">
                  <h2 className="text-2xl font-bold mb-6 flex items-center space-x-3 rtl:space-x-reverse" style={{ color: '#194866' }}>
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <IconComponent className="h-5 w-5 text-green-600" />
                    </div>
                    <span>{section.title}</span>
                  </h2>
                  <div className="prose prose-lg max-w-none">
                    <p className="text-gray-700 leading-relaxed text-justify mb-4">
                      {section.content}
                    </p>
                    <p className="text-gray-700 leading-relaxed text-justify">
                      {section.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Data Protection Highlights */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ color: '#194866' }}>
              {language === 'ar' ? 'حماية البيانات' : 'Data Protection'}
            </h2>
            <div className="w-16 h-1 mx-auto rounded-full" style={{ backgroundColor: '#194866' }}></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-green-50 rounded-xl transition-all duration-300 hover:shadow-lg">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                <Lock className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#194866' }}>
                {language === 'ar' ? 'تشفير البيانات' : 'Data Encryption'}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {language === 'ar' 
                  ? 'جميع بياناتك محمية بأحدث تقنيات التشفير'
                  : 'All your data is protected with the latest encryption technologies'
                }
              </p>
            </div>

            <div className="text-center p-6 bg-blue-50 rounded-xl transition-all duration-300 hover:shadow-lg">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                <Eye className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#194866' }}>
                {language === 'ar' ? 'الشفافية الكاملة' : 'Full Transparency'}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {language === 'ar' 
                  ? 'نوضح لك بالضبط كيف نستخدم معلوماتك'
                  : 'We show you exactly how we use your information'
                }
              </p>
            </div>

            <div className="text-center p-6 bg-purple-50 rounded-xl transition-all duration-300 hover:shadow-lg">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                <UserCheck className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#194866' }}>
                {language === 'ar' ? 'التحكم الكامل' : 'Full Control'}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {language === 'ar' 
                  ? 'لديك السيطرة الكاملة على بياناتك الشخصية'
                  : 'You have full control over your personal data'
                }
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Privacy;