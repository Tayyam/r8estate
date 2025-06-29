import React from 'react';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface FooterProps {
  onNavigate?: (page: string) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { translations, language } = useLanguage();
  
  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' }
  ];

  const handleLinkClick = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Company Info */}
          <div className="lg:col-span-1 text-center md:text-right rtl:md:text-right ltr:md:text-left">
            <div className="flex items-center justify-center md:justify-start mb-4">
              <img 
                src="https://i.ibb.co/YrNNbnz/R8-ESTATEORG.png" 
                alt="R8ESTATE Logo" 
                className="w-8 h-8 object-contain mr-3 rounded-full"
                style={{ borderRadius: '20%' }}
              />
              <div className="text-xl font-bold">
                <span style={{ color: '#EE183F' }}>R8</span>
                <span className="text-white">ESTATE</span>
              </div>
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed text-sm">
              {translations?.description || 'R8 Estate is the leading review platform for the real estate sector in Egypt. We help customers find the best trusted real estate companies.'}
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-center md:justify-start space-x-3 rtl:space-x-reverse">
                <Mail className="h-4 w-4 flex-shrink-0" style={{ color: '#EE183F' }} />
                <a 
                  href="mailto:info@r8estate.com"
                  className="text-gray-300 text-sm transition-colors duration-200"
                  style={{ ':hover': { color: '#EE183F' } }}
                  onMouseEnter={(e) => {
                    e.target.style.color = '#EE183F';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = '#d1d5db';
                  }}
                >
                  info@r8estate.com
                </a>
              </div>
              <div className="flex items-center justify-center md:justify-start space-x-3 rtl:space-x-reverse">
                <Phone className="h-4 w-4 flex-shrink-0" style={{ color: '#EE183F' }} />
                <a 
                  href="tel:+201234567890"
                  className="text-gray-300 text-sm transition-colors duration-200"
                  onMouseEnter={(e) => {
                    e.target.style.color = '#EE183F';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = '#d1d5db';
                  }}
                >
                  +20 123 456 7890
                </a>
              </div>
              <div className="flex items-center justify-center md:justify-start space-x-3 rtl:space-x-reverse">
                <MapPin className="h-4 w-4 flex-shrink-0" style={{ color: '#EE183F' }} />
                <span className="text-gray-300 text-sm">
                  {translations?.address || 'Cairo, Egypt'}
                </span>
              </div>
            </div>
          </div>

          {/* About Links */}
          <div className="text-center md:text-right rtl:md:text-right ltr:md:text-left">
            <h3 className="font-bold text-white mb-4">
              {translations?.about || 'About'}
            </h3>
            <ul className="space-y-3">
              <li>
                <button 
                  onClick={() => handleLinkClick('about')}
                  className="text-gray-300 transition-colors duration-200 text-sm block w-full text-center md:text-right rtl:md:text-right ltr:md:text-left"
                  onMouseEnter={(e) => {
                    e.target.style.color = '#EE183F';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = '#d1d5db';
                  }}
                >
                  {translations?.aboutUs || 'About Us'}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleLinkClick('contact')}
                  className="text-gray-300 transition-colors duration-200 text-sm block w-full text-center md:text-right rtl:md:text-right ltr:md:text-left"
                  onMouseEnter={(e) => {
                    e.target.style.color = '#EE183F';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = '#d1d5db';
                  }}
                >
                  {translations?.contactUs || 'Contact Us'}
                </button>
              </li>
            </ul>
          </div>

          {/* Community Links */}
          <div className="text-center md:text-right rtl:md:text-right ltr:md:text-left">
            <h3 className="font-bold text-white mb-4">
              {translations?.community || 'Community'}
            </h3>
            <ul className="space-y-3">
              <li>
                <button 
                  onClick={() => handleLinkClick('reviewers')}
                  className="text-gray-300 transition-colors duration-200 text-sm block w-full text-center md:text-right rtl:md:text-right ltr:md:text-left"
                  onMouseEnter={(e) => {
                    e.target.style.color = '#EE183F';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = '#d1d5db';
                  }}
                >
                  {translations?.forReviewers || 'For Reviewers'}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleLinkClick('companies')}
                  className="text-gray-300 transition-colors duration-200 text-sm block w-full text-center md:text-right rtl:md:text-right ltr:md:text-left"
                  onMouseEnter={(e) => {
                    e.target.style.color = '#EE183F';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = '#d1d5db';
                  }}
                >
                  {translations?.forCompanies || 'For Companies'}
                </button>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="text-center md:text-right rtl:md:text-right ltr:md:text-left">
            <h3 className="font-bold text-white mb-4">
              {translations?.legal || 'Legal'}
            </h3>
            <ul className="space-y-3 mb-6">
              <li>
                <button 
                  onClick={() => handleLinkClick('terms')}
                  className="text-gray-300 transition-colors duration-200 text-sm block w-full text-center md:text-right rtl:md:text-right ltr:md:text-left"
                  onMouseEnter={(e) => {
                    e.target.style.color = '#EE183F';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = '#d1d5db';
                  }}
                >
                  {translations?.termsOfUse || 'Terms of Use'}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleLinkClick('privacy')}
                  className="text-gray-300 transition-colors duration-200 text-sm block w-full text-center md:text-right rtl:md:text-right ltr:md:text-left"
                  onMouseEnter={(e) => {
                    e.target.style.color = '#EE183F';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = '#d1d5db';
                  }}
                >
                  {translations?.privacyPolicy || 'Privacy Policy'}
                </button>
              </li>
            </ul>

            {/* Social Links */}
            <div>
              <h4 className="font-semibold text-white mb-3">
                {translations?.followUs || 'Follow Us'}
              </h4>
              <div className="flex space-x-3 rtl:space-x-reverse justify-center md:justify-start">
                {socialLinks.map((social, index) => {
                  const IconComponent = social.icon;
                  return (
                    <a
                      key={index}
                      href={social.href}
                      className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center transition-colors duration-200"
                      aria-label={social.label}
                      style={{ ':hover': { backgroundColor: '#EE183F' } }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#EE183F';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#374151';
                      }}
                    >
                      <IconComponent className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-700 mt-12 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            {translations?.copyright || '© 2024 R8 ESTATE. All rights reserved.'}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;