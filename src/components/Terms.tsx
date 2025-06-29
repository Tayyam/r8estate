import React from 'react';
import { FileText, Shield, Scale } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface TermsProps {
  onNavigate: (page: string) => void;
}

const Terms: React.FC<TermsProps> = ({ onNavigate }) => {
  const { translations, language } = useLanguage();

  const loremText = language === 'ar' 
    ? 'هذا النص هو مثال لنص يمكن أن يستبدل في نفس المساحة، لقد تم توليد هذا النص من مولد النص العربى، حيث يمكنك أن تولد مثل هذا النص أو العديد من النصوص الأخرى إضافة إلى زيادة عدد الحروف التى يولدها التطبيق. إذا كنت تحتاج إلى عدد أكبر من الفقرات يتيح لك مولد النص العربى زيادة عدد الفقرات كما تريد، النص لن يبدو مقسما ولا يحوي أخطاء لغوية، مولد النص العربى مفيد لمصممي المواقع على وجه الخصوص، حيث يحتاج العميل فى كثير من الأحيان أن يطلع على صورة حقيقية لتصميم الموقع.'
    : 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

  const sections = [
    { title: translations?.section1Title || '1. Acceptance of Terms', content: loremText },
    { title: translations?.section2Title || '2. Description of Service', content: loremText },
    { title: translations?.section3Title || '3. User Accounts', content: loremText },
    { title: translations?.section4Title || '4. Acceptable Conduct', content: loremText },
    { title: translations?.section5Title || '5. Intellectual Property', content: loremText },
    { title: translations?.section6Title || '6. Privacy', content: loremText },
    { title: translations?.section7Title || '7. Disclaimers', content: loremText },
    { title: translations?.section8Title || '8. Modifications to Terms', content: loremText },
    { title: translations?.section9Title || '9. Governing Law', content: loremText },
    { title: translations?.section10Title || '10. Contact Information', content: loremText }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-8 shadow-xl" style={{ backgroundColor: '#194866' }}>
              <Scale className="h-10 w-10" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: '#194866' }}>
              {translations?.termsOfUse || 'Terms of Use'}
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-600 leading-relaxed">
              {translations?.lastUpdated || 'Last Updated: December 15, 2024'}
            </p>
            <div className="w-24 h-1 mx-auto rounded-full" style={{ backgroundColor: '#EE183F' }}></div>
          </div>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {sections.map((section, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-8 hover-lift transition-all duration-300">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-3 rtl:space-x-reverse">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <span>{section.title}</span>
                </h2>
                <div className="prose prose-lg max-w-none">
                  <p className="text-gray-700 leading-relaxed text-justify">
                    {section.content}
                  </p>
                  <p className="text-gray-700 leading-relaxed text-justify mt-4">
                    {section.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl p-8 border-l-4 rtl:border-r-4 rtl:border-l-0 border-blue-600 shadow-sm">
            <div className="flex items-start space-x-4 rtl:space-x-reverse">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {translations?.importantNotice || 'Important Notice'}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {translations?.importantNoticeText || 
                   'Please read these terms carefully before using the R8 ESTATE platform. By using the platform, you agree to be bound by these terms and conditions.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Terms;