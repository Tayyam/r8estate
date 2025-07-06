import React, { useState } from 'react';
import { Globe, ChevronDown, Menu, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const GlobalHeader: React.FC = () => {
  const { language, translations, setLanguage, direction } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const languages = [
    { code: 'en' as const, name: translations?.english || 'English', flag: '🇺🇸' },
    { code: 'ar' as const, name: translations?.arabic || 'العربية', flag: '🇸🇦' },
  ];

  const navItems = [
    { id: 'home', label: translations?.home || 'Home', path: '/' },
    { id: 'categories', label: translations?.categories || 'Categories', path: '/categories' },
    { id: 'about', label: translations?.about || 'About', path: '/about' },
    { id: 'pricing', label: translations?.pricing || 'Pricing', path: '/pricing' },
  ];

  const currentLanguage = languages.find(lang => lang.code === language);

  const handleNavClick = (item: { id: string, path: string }) => {
    navigate(item.path);
    setIsMobileMenuOpen(false);
  };

  // Get current page from location
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === '/') return 'home';
    return path.split('/')[1] || 'home';
  };

  const activePage = getCurrentPage();

  // Close mobile menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileMenuOpen) {
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu && !mobileMenu.contains(event.target as Node)) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  return (
    <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <div className="flex items-center space-x-3 rtl:space-x-reverse flex-shrink-0 cursor-pointer" onClick={() => handleNavClick(navItems[0])}>
            <img 
              src="https://i.ibb.co/hx0kCnf4/R8ESTATE.png" 
              alt="R8ESTATE Logo" 
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-full"
              style={{ borderRadius: '20%' }}
            />
            <div className="text-lg sm:text-xl font-bold">
              <span style={{ color: '#EE183F' }}>R8</span>
              <span style={{ color: '#194866' }}>ESTATE</span>
            </div>
          </div>

          {/* Desktop Navigation Menu */}
          <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8 rtl:space-x-reverse">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 text-sm xl:text-base ${
                  activePage === item.id
                    ? 'bg-opacity-10'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                style={{
                  color: activePage === item.id ? '#194866' : '',
                  backgroundColor: activePage === item.id ? 'rgba(25, 72, 102, 0.1)' : ''
                }}
                onMouseEnter={(e) => {
                  if (activePage !== item.id) {
                    e.target.style.color = '#194866';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activePage !== item.id) {
                    e.target.style.color = '#374151';
                  }
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Desktop Right side - Language */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-4 rtl:space-x-reverse">
            
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                className="flex items-center space-x-2 rtl:space-x-reverse px-2 lg:px-3 py-2 rounded-lg border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
              >
                <Globe className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700 hidden lg:inline">
                  {currentLanguage?.flag}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isLanguageOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLanguageOpen && (
                <div className={`absolute top-full mt-2 ${direction === 'rtl' ? 'left-0' : 'right-0'} bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-40 z-50`}>
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setIsLanguageOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-3 rtl:space-x-reverse transition-colors duration-150 ${
                        language === lang.code ? 'text-gray-700' : 'text-gray-700'
                      }`}
                      style={{
                        backgroundColor: language === lang.code ? 'rgba(25, 72, 102, 0.1)' : '',
                        color: language === lang.code ? '#194866' : ''
                      }}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-all duration-200"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div id="mobile-menu" className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Navigation Items */}
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`block w-full text-left px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                    activePage === item.id
                      ? 'bg-opacity-10'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  style={{
                    color: activePage === item.id ? '#194866' : '',
                    backgroundColor: activePage === item.id ? 'rgba(25, 72, 102, 0.1)' : ''
                  }}
                >
                  {item.label}
                </button>
              ))}

              {/* Mobile Language Selector */}
              <div className="pt-2 border-t border-gray-200 mt-3">
                <div className="px-3 py-2 text-sm font-medium text-gray-700 mb-2">
                  {translations?.language || 'Language'}
                </div>
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center space-x-3 rtl:space-x-reverse transition-colors duration-150 rounded-lg ${
                      language === lang.code ? 'text-gray-700' : 'text-gray-700'
                    }`}
                    style={{
                      backgroundColor: language === lang.code ? 'rgba(25, 72, 102, 0.1)' : '',
                      color: language === lang.code ? '#194866' : ''
                    }}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default GlobalHeader;