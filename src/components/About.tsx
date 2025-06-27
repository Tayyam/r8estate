import React from 'react';
import { Users, Target, Award, Heart, Eye, Lightbulb, Shield } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const About = () => {
  const { translations } = useLanguage();

  const teamMembers = [
    {
      name: 'Ahmed Mohamed Ali',
      nameAr: translations?.ceoTitle ? 'أحمد محمد علي' : 'Ahmed Mohamed Ali',
      title: translations?.ceoTitle || 'CEO & Founder',
      image: '👨‍💼',
      description: 'Over 15 years of experience in the real estate sector'
    },
    {
      name: 'Fatima Hassan Ibrahim',
      nameAr: translations?.ctoTitle ? 'فاطمة حسن إبراهيم' : 'Fatima Hassan Ibrahim',
      title: translations?.ctoTitle || 'Chief Technology Officer',
      image: '👩‍💻',
      description: 'Specialist in developing technical platforms'
    },
    {
      name: 'Mohamed Ahmed El-Sayed',
      nameAr: translations?.cmoTitle ? 'محمد أحمد السيد' : 'Mohamed Ahmed El-Sayed',
      title: translations?.cmoTitle || 'Chief Marketing Officer',
      image: '👨‍💼',
      description: 'Expert in digital marketing strategies'
    },
    {
      name: 'Sara Abdel Rahman',
      nameAr: translations?.headOfOperationsTitle ? 'سارة عبد الرحمن' : 'Sara Abdel Rahman',
      title: translations?.headOfOperationsTitle || 'Head of Operations',
      image: '👩‍💼',
      description: 'Specialist in operations management and quality'
    }
  ];

  const values = [
    {
      icon: Eye,
      title: translations?.transparencyValue || 'Transparency',
      description: translations?.transparencyDesc || 'We believe transparency is the foundation of trust in the real estate market',
      color: '#194866',
      bgColor: 'rgba(25, 72, 102, 0.1)'
    },
    {
      icon: Shield,
      title: translations?.trustValue || 'Trust',
      description: translations?.trustDesc || 'We build bridges of trust between customers and real estate companies',
      color: '#EE183F',
      bgColor: 'rgba(238, 24, 63, 0.1)'
    },
    {
      icon: Award,
      title: translations?.qualityValue || 'Quality',
      description: translations?.qualityDesc || 'We strive to deliver the highest quality standards in our services',
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.1)'
    }
  ];

  const stats = [
    {
      number: '500+',
      label: translations?.totalCompanies || 'Registered Companies',
      icon: '🏢'
    },
    {
      number: '10,000+',
      label: translations?.totalReviews || 'Genuine Reviews',
      icon: '⭐'
    },
    {
      number: '50,000+',
      label: translations?.monthlyVisitors || 'Monthly Visitors',
      icon: '👥'
    },
    {
      number: '4.8',
      label: translations?.avgPlatformRating || 'Average Rating',
      icon: '📊'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-8 shadow-xl" style={{ backgroundColor: '#194866' }}>
              <Target className="h-10 w-10" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: '#194866' }}>
              {translations?.aboutUsTitle || 'About Us'}
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-600 leading-relaxed">
              {translations?.aboutUsSubtitle || 'Our Mission: Enhancing Transparency in Egypt\'s Real Estate Sector'}
            </p>
            <div className="w-24 h-1 mx-auto rounded-full" style={{ backgroundColor: '#EE183F' }}></div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center space-x-3 rtl:space-x-reverse mb-6">
              <Heart className="h-8 w-8" style={{ color: '#EE183F' }} />
              <h2 className="text-3xl md:text-4xl font-bold" style={{ color: '#194866' }}>
                {translations?.ourStory || 'Our Story'}
              </h2>
            </div>
            <div className="w-16 h-1 mx-auto rounded-full" style={{ backgroundColor: '#EE183F' }}></div>
          </div>

          <div className="space-y-8">
            <div className="bg-gray-50 rounded-2xl p-8 transition-all duration-300 hover:shadow-lg hover:scale-105">
              <p className="text-lg leading-relaxed text-gray-700 text-center">
                {translations?.storyParagraph1 || 'R8 ESTATE was founded in 2024 with a clear vision: to make Egypt\'s real estate market more transparent and trustworthy. We noticed that customers faced difficulty finding reliable information about real estate companies, making investment decisions challenging and risky.'}
              </p>
            </div>

            <div className="rounded-2xl p-8 transition-all duration-300 hover:shadow-lg hover:scale-105" style={{ backgroundColor: 'rgba(25, 72, 102, 0.05)' }}>
              <p className="text-lg leading-relaxed text-gray-700 text-center">
                {translations?.storyParagraph2 || 'Through our innovative platform, we provide customers with the ability to read genuine reviews from previous clients, helping them make informed decisions. We also enable companies to interact with their customers and respond to their inquiries, creating an environment of mutual trust.'}
              </p>
            </div>

            <div className="rounded-2xl p-8 transition-all duration-300 hover:shadow-lg hover:scale-105" style={{ backgroundColor: 'rgba(238, 24, 63, 0.05)' }}>
              <p className="text-lg leading-relaxed text-gray-700 text-center">
                {translations?.storyParagraph3 || 'We believe that transparency is the foundation of success in any market, and we strive to be the bridge connecting customers with trusted real estate companies in Egypt. Our goal is to build a real estate community based on trust and quality.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20" style={{ backgroundColor: '#f8fafc' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#194866' }}>
              {translations?.platformStats || 'Platform Statistics'}
            </h2>
            <p className="text-xl text-gray-600">
              {translations?.platformStatsDesc || 'Numbers that reflect customer trust in our platform'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 text-center shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 border-2 border-transparent"
                onMouseEnter={(e) => {
                  e.target.style.borderColor = '#194866';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = 'transparent';
                }}
              >
                <div className="text-4xl mb-4">{stat.icon}</div>
                <div className="text-3xl md:text-4xl font-bold mb-2" style={{ color: '#194866' }}>
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Team Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center space-x-3 rtl:space-x-reverse mb-6">
              <Users className="h-8 w-8" style={{ color: '#194866' }} />
              <h2 className="text-3xl md:text-4xl font-bold" style={{ color: '#194866' }}>
                {translations?.ourTeam || 'Our Team'}
              </h2>
            </div>
            <div className="w-16 h-1 mx-auto rounded-full" style={{ backgroundColor: '#194866' }}></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-8 text-center group hover:shadow-2xl transition-all duration-300 hover:scale-105"
                onMouseEnter={(e) => {
                  e.target.style.borderColor = '#194866';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = '#f3f4f6';
                }}
              >
                {/* Profile Image Placeholder */}
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(25, 72, 102, 0.1) 0%, rgba(238, 24, 63, 0.1) 100%)' }}>
                  {member.image}
                </div>

                {/* Name */}
                <h3 className="text-xl font-bold mb-2" style={{ color: '#194866' }}>
                  {translations ? member.nameAr : member.name}
                </h3>

                {/* Title */}
                <p className="font-medium mb-3" style={{ color: '#EE183F' }}>
                  {member.title}
                </p>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4">
                  {member.description}
                </p>

                {/* Decorative Element */}
                <div className="w-12 h-1 mx-auto rounded-full" style={{ background: 'linear-gradient(90deg, #194866 0%, #EE183F 100%)' }}></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20" style={{ backgroundColor: '#f8fafc' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center space-x-3 rtl:space-x-reverse mb-6">
              <Lightbulb className="h-8 w-8" style={{ color: '#EE183F' }} />
              <h2 className="text-3xl md:text-4xl font-bold" style={{ color: '#194866' }}>
                {translations?.ourValues || 'Our Values'}
              </h2>
            </div>
            <div className="w-16 h-1 mx-auto rounded-full" style={{ backgroundColor: '#EE183F' }}></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value, index) => {
              const IconComponent = value.icon;
              return (
                <div
                  key={index}
                  className="text-center p-8 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-xl"
                  style={{ backgroundColor: value.bgColor }}
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-6 shadow-lg" style={{ backgroundColor: value.color }}>
                    <IconComponent className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-4" style={{ color: '#194866' }}>
                    {value.title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="rounded-3xl p-12 shadow-2xl" style={{ background: 'linear-gradient(135deg, rgba(25, 72, 102, 0.05) 0%, rgba(238, 24, 63, 0.05) 100%)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white mx-auto mb-8 shadow-lg" style={{ backgroundColor: '#194866' }}>
              <Target className="h-8 w-8" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: '#194866' }}>
              {translations?.ourVision || 'Our Vision'}
            </h2>
            <p className="text-xl leading-relaxed text-gray-700 mb-8">
              {translations?.visionText || 'To be the first and most trusted reference for evaluating real estate companies in Egypt and the Middle East, and to contribute to building a real estate market based on transparency, quality, and mutual trust among all parties.'}
            </p>
            <div className="w-24 h-1 mx-auto rounded-full" style={{ background: 'linear-gradient(90deg, #194866 0%, #EE183F 100%)' }}></div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;