import React, { useState, useEffect } from 'react';
import { Globe, ChevronDown, User, UserPlus, Menu, X, LogOut, Settings as SettingsIcon, Building2, MessageSquare, Bell } from 'lucide-react';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../config/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { getCompanySlug } from '../utils/urlUtils';
import NotificationBell from './Header/NotificationBell';

interface HeaderProps {
  currentPage?: string;
  setCurrentPage?: (page: string) => void;
  onNavigateToProfile?: (companyId: string, companyName: string) => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage = 'home', setCurrentPage, onNavigateToProfile }) => {
  const { language, translations, setLanguage, direction } = useLanguage();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLanguageOpen, setIsLanguageOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [userCompanyData, setUserCompanyData] = useState<any>(null);
  const [loadingCompanyId, setLoadingCompanyId] = useState(false);

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

  // Load company data for company users
  useEffect(() => {
    const loadCompanyData = async () => {
      if (!currentUser || currentUser.role !== 'company') {
        setUserCompanyId(null);
        setUserCompanyData(null);
        return;
      }

      setLoadingCompanyId(true);
      
      try {
        // First check if companyId is already in user data
        if (currentUser.companyId) {
          setUserCompanyId(currentUser.companyId);
          
          // Load company data
          const companyDoc = await getDoc(doc(db, 'companies', currentUser.companyId));
          if (companyDoc.exists()) {
            setUserCompanyData({
              id: companyDoc.id,
              ...companyDoc.data()
            });
          }
          
          setLoadingCompanyId(false);
          return;
        }

        // If not in user data, search for company by email
        const companiesQuery = query(
          collection(db, 'companies'),
          where('email', '==', currentUser.email)
        );
        
        const companiesSnapshot = await getDocs(companiesQuery);
        
        if (!companiesSnapshot.empty) {
          const companyDoc = companiesSnapshot.docs[0];
          const companyData = {
            id: companyDoc.id,
            ...companyDoc.data()
          };
          
          setUserCompanyId(companyDoc.id);
          setUserCompanyData(companyData);
        } else {
          setUserCompanyId(null);
          setUserCompanyData(null);
        }
      } catch (error) {
        console.error('Error loading company data:', error);
        setUserCompanyId(null);
        setUserCompanyData(null);
      } finally {
        setLoadingCompanyId(false);
      }
    };

    loadCompanyData();
  }, [currentUser]);

  const handleCreateAccount = () => {
    if (setCurrentPage) {
      setCurrentPage('register');
    } else {
      navigate('/register');
    }
    setIsMobileMenuOpen(false);
  };

  const handleLogin = () => {
    if (setCurrentPage) {
      setCurrentPage('login');
    } else {
      navigate('/login');
    }
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsUserMenuOpen(false);
      setIsMobileMenuOpen(false);
      if (setCurrentPage) {
        setCurrentPage('home');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavClick = (item: { id: string, path: string }) => {
    if (setCurrentPage) {
      setCurrentPage(item.id);
    } else {
      navigate(item.path);
    }
    setIsMobileMenuOpen(false);
  };

  // Handle company profile navigation
  const handleCompanyProfile = () => {
    if (userCompanyId) {
      if (setCurrentPage) {
        // Use the existing navigation pattern from App.tsx
        const event = new CustomEvent('navigateToCompanyProfile', {
          detail: { companyId: userCompanyId, companyName: userCompanyData.name }
        });
        window.dispatchEvent(event);
      } else {
        const companySlug = getCompanySlug(userCompanyData.name);
        navigate(`/company/${companySlug}/${userCompanyId}/overview`);
      }
      setIsUserMenuOpen(false);
      setIsMobileMenuOpen(false);
    }
  };

  // Handle personal profile navigation
  const handlePersonalProfile = () => {
    if (setCurrentPage) {
      setCurrentPage('personal-profile');
    } else {
      navigate('/profile');
    }
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  // Handle my reviews navigation - only for regular users, not for admins
  const handleMyReviews = () => {
    if (setCurrentPage) {
      setCurrentPage('my-reviews');
    } else {
      navigate('/profile/reviews');
    }
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  // Get user avatar based on role
  const getUserAvatar = () => {
    // For company users, show company logo if available
    if (currentUser?.role === 'company' && userCompanyData?.logoUrl) {
      return (
        <img 
          src={userCompanyData.logoUrl} 
          alt={userCompanyData.name || currentUser.displayName}
          className="w-full h-full rounded-full object-cover"
        />
      );
    }
    
    // For regular users and admins, show profile photo
    if (currentUser?.photoURL) {
      return (
        <img 
          src={currentUser.photoURL} 
          alt={currentUser.displayName}
          className="w-full h-full rounded-full object-cover"
        />
      );
    }
    
    // Default user icon
    return <User className="w-4 h-4 lg:w-5 lg:h-5 text-white" />;
  };

  // Close mobile menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileMenuOpen) {
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu && !mobileMenu.contains(event.target as Node)) {
          setIsMobileMenuOpen(false);
        }
      }
      if (isUserMenuOpen) {
        const userMenu = document.getElementById('user-menu');
        if (userMenu && !userMenu.contains(event.target as Node)) {
          setIsUserMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen, isUserMenuOpen]);

  // Get current page from location
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === '/') return 'home';
    return path.split('/')[1] || 'home';
  };

  const activePage = currentPage || getCurrentPage();

  return (
    <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 relative">
          
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

          {/* Desktop Right side - Language, Profile, Sign Up */}
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

            {/* User Profile (when logged in) */}
            {currentUser ? (
              <div className="flex items-center space-x-3 rtl:space-x-reverse" id="user-menu-container">
                <div className="relative">
                  <NotificationBell onNavigate={setCurrentPage} />
                </div>

                <div className="relative" id="user-menu">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  <div className="flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 rounded-full shadow-md" style={{ backgroundColor: '#194866' }}>
                    {getUserAvatar()}
                  </div>
                  <div className="hidden lg:block text-left rtl:text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {currentUser.role === 'company' && userCompanyData 
                        ? userCompanyData.name 
                        : currentUser.displayName
                      }
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {currentUser.role === 'company'
                        ? (translations?.companyAccount || 'Company Account')
                        : currentUser.role === 'admin'
                          ? (translations?.adminAccount || 'Admin Account')
                          : (translations?.userAccount || 'User Account')
                      }
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isUserMenuOpen && (
                  <div className={`absolute top-full mt-2 ${direction === 'rtl' ? 'left-0' : 'right-0'} bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-48 z-50`}>
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">
                        {currentUser.role === 'company' && userCompanyData 
                          ? userCompanyData.name 
                          : currentUser.displayName
                        }
                      </p>
                      <p className="text-xs text-gray-500">{currentUser.email}</p>
                      <p className="text-xs text-gray-500 capitalize mt-1">
                        {currentUser.role === 'company'
                          ? (translations?.companyAccount || 'Company Account')
                          : currentUser.role === 'admin'
                            ? (translations?.adminAccount || 'Admin Account')
                            : (translations?.userAccount || 'User Account')
                        }
                      </p>
                    </div>

                    {/* Company Profile Link */}
                    {currentUser.role === 'company' && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (setCurrentPage) {
                            setCurrentPage('company-dashboard');
                          } else {
                            navigate('/company-dashboard');
                          }
                        }}
                        disabled={loadingCompanyId || !userCompanyId}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 rtl:space-x-reverse transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingCompanyId ? (
                          <>
                            <div className="w-4 h-4 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                            <span>{translations?.loading || 'Loading...'}</span>
                          </>
                        ) : userCompanyId ? (
                          <>
                            <Building2 className="w-4 h-4" />
                            <span>{translations?.companyDashboard || 'Dashboard'}</span>
                          </>
                        ) : (
                          <>
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400">{translations?.noCompanyFound || 'No Company Found'}</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Personal Profile Link - Only for regular users and admins */}
                    {currentUser.role !== 'company' && (
                      <button
                        onClick={handlePersonalProfile}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 rtl:space-x-reverse transition-colors duration-150"
                      >
                        <User className="w-4 h-4" />
                        <span>{translations?.personalProfile || 'Personal Profile'}</span>
                      </button>
                    )}
                    
                    {/* My Reviews Link - Only for regular users, not for admins */}
                    {currentUser.role === 'user' && (
                      <button
                        onClick={handleMyReviews}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 rtl:space-x-reverse transition-colors duration-150"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>{translations?.myReviews || 'My Reviews'}</span>
                      </button>
                    )}

                    {/* Settings link for admin users */}
                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (setCurrentPage) {
                            setCurrentPage('settings');
                          } else {
                            navigate('/admin/settings');
                          }
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 rtl:space-x-reverse transition-colors duration-150"
                      >
                        <SettingsIcon className="w-4 h-4" />
                        <span>{translations?.adminSettings || 'Admin Settings'}</span>
                      </button>
                    )}

                    {/* Company Profile Button */}
                    {currentUser.role === 'company' && userCompanyId && (
                      <button
                        onClick={() => {
                          if (onNavigateToProfile && userCompanyData) {
                            onNavigateToProfile(userCompanyId, userCompanyData.name);
                          } else {
                            const companySlug = getCompanySlug(userCompanyData?.name || '');
                            navigate(`/company/${companySlug}/${userCompanyId}/overview`);
                          }
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 rtl:space-x-reverse transition-colors duration-150"
                      >
                        <User className="w-4 h-4" />
                        <span>{translations?.companyProfile || 'Profile'}</span>
                      </button>
                    )}

                    {/* Logout */}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3 rtl:space-x-reverse transition-colors duration-150"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{translations?.logout || 'Logout'}</span>
                    </button>
                  </div>
                )}
                </div>
              </div>
            ) : (
              <>
                {/* Create Account Button */}
                <button
                  onClick={handleCreateAccount}
                  className="flex items-center space-x-1 lg:space-x-2 rtl:space-x-reverse px-2 lg:px-4 py-2 text-white rounded-lg transition-all duration-200 font-medium text-xs lg:text-sm shadow-md hover:shadow-lg"
                  style={{ backgroundColor: '#194866' }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#0f3147';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#194866';
                  }}
                >
                  <UserPlus className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span className="hidden lg:inline">{translations?.createAccount || 'Create Account'}</span>
                  <span className="lg:hidden">{translations?.signup || 'Sign Up'}</span>
                </button>

                {/* Login Button */}
                <button
                  onClick={handleLogin}
                  className="px-2 lg:px-3 py-2 text-xs lg:text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
                  onMouseEnter={(e) => {
                    e.target.style.color = '#194866';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = '#4b5563';
                  }}
                >
                  {translations?.login || 'Login'}
                </button>
              </>
            )}
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

              {/* Mobile User Actions */}
              <div className="pt-3 border-t border-gray-200 mt-3 space-y-2">
                {currentUser ? (
                  <>
                    {/* Notification Bell for Mobile */}
                    <div className="mr-3">
                      <NotificationBell onNavigate={setCurrentPage} />
                    </div>
                    
                    <div className="flex items-center px-3 py-2 space-x-3 rtl:space-x-reverse">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full shadow-md" style={{ backgroundColor: '#194866' }}>
                        {getUserAvatar()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {currentUser.role === 'company' && userCompanyData 
                            ? userCompanyData.name 
                            : currentUser.displayName
                          }
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {currentUser.role === 'company'
                            ? (translations?.companyAccount || 'Company Account')
                            : currentUser.role === 'admin'
                              ? (translations?.adminAccount || 'Admin Account')
                              : (translations?.userAccount || 'User Account')
                          }
                        </p>
                      </div>
                    </div>

                    {/* Company Profile for mobile */}
                    {currentUser.role === 'company' && (
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          if (setCurrentPage) {
                            setCurrentPage('company-dashboard');
                          } else {
                            navigate('/company-dashboard');
                          }
                        }}
                        disabled={loadingCompanyId || !userCompanyId}
                        className="w-full flex items-center space-x-2 rtl:space-x-reverse px-4 py-3 text-gray-700 rounded-lg transition-all duration-200 font-medium text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingCompanyId ? (
                          <>
                            <div className="w-4 h-4 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                            <span>{translations?.loading || 'Loading...'}</span>
                          </>
                        ) : userCompanyId ? (
                          <>
                            <Building2 className="w-4 w-4 text-blue-600" />
                            <span>{translations?.companyDashboard || 'Dashboard'}</span>
                          </>
                        ) : (
                          <>
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400">{translations?.noCompanyFound || 'No Company Found'}</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Personal Profile for mobile - For all users except company */}
                    {currentUser.role !== 'company' && (
                      <button
                        onClick={handlePersonalProfile}
                        className="w-full flex items-center space-x-2 rtl:space-x-reverse px-4 py-3 text-gray-700 rounded-lg transition-all duration-200 font-medium text-sm hover:bg-gray-50"
                      >
                        <User className="w-4 h-4" />
                        <span>{translations?.personalProfile || 'Personal Profile'}</span>
                      </button>
                    )}
                    
                    {/* Company Profile for mobile */}
                    {currentUser.role === 'company' && userCompanyId && (
                      <button
                        onClick={() => {
                          if (onNavigateToProfile && userCompanyData) {
                            onNavigateToProfile(userCompanyId, userCompanyData.name);
                          } else {
                            const companySlug = getCompanySlug(userCompanyData?.name || '');
                            navigate(`/company/${companySlug}/${userCompanyId}/overview`);
                          }
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full flex items-center space-x-2 rtl:space-x-reverse px-4 py-3 text-gray-700 rounded-lg transition-all duration-200 font-medium text-sm hover:bg-gray-50"
                      >
                        <User className="w-4 h-4" />
                        <span>{translations?.companyProfile || 'Profile'}</span>
                      </button>
                    )}
                    
                    {/* My Reviews for mobile - Only for regular users, not for admins */}
                    {currentUser.role === 'user' && (
                      <button
                        onClick={handleMyReviews}
                        className="w-full flex items-center space-x-2 rtl:space-x-reverse px-4 py-3 text-gray-700 rounded-lg transition-all duration-200 font-medium text-sm hover:bg-gray-50"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>{translations?.myReviews || 'My Reviews'}</span>
                      </button>
                    )}
                    
                    {/* Settings link for admin users in mobile */}
                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          if (setCurrentPage) {
                            setCurrentPage('settings');
                          } else {
                            navigate('/admin/settings');
                          }
                        }}
                        className="w-full flex items-center space-x-2 rtl:space-x-reverse px-4 py-3 text-gray-700 rounded-lg transition-all duration-200 font-medium text-sm hover:bg-gray-50"
                      >
                        <SettingsIcon className="w-4 h-4" />
                        <span>{translations?.adminSettings || 'Admin Settings'}</span>
                      </button>
                    )}
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-3 text-red-600 rounded-lg transition-all duration-200 font-medium text-sm hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{translations?.logout || 'Logout'}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleCreateAccount}
                      className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-3 text-white rounded-lg transition-all duration-200 font-medium text-sm shadow-md"
                      style={{ backgroundColor: '#194866' }}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{translations?.createAccount || 'Create Account'}</span>
                    </button>

                    <button
                      onClick={handleLogin}
                      className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200 text-center rounded-lg hover:bg-gray-50"
                      onMouseEnter={(e) => {
                        e.target.style.color = '#194866';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = '#4b5563';
                      }}
                    >
                      {translations?.login || 'Login'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;