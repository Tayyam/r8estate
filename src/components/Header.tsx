Here's the fixed version with all missing closing brackets added:

```typescript
import React, { useState, useEffect } from 'react';
import { Globe, ChevronDown, User, UserPlus, Menu, X, LogOut, Settings as SettingsIcon, Building2, MessageSquare } from 'lucide-react';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../config/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { getCompanySlug } from '../utils/urlUtils';

interface HeaderProps {
  currentPage?: string;
  setCurrentPage?: (page: string) => void;
  isAuthPage?: boolean;
}

const Header: React.FC<HeaderProps> = ({ currentPage = 'home', setCurrentPage, isAuthPage = false }) => {
  // ... [rest of the code remains unchanged until the problematic section]

          {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div id="mobile-menu" className="md:hidden border-t border-gray-200 bg-white">
            {!isAuthPage && (
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
            )}
            
            {/* Mobile Language Selector for Auth Pages */}
            {isAuthPage && (
              <div className="px-2 pt-2 pb-3">
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
            )}

            {!isAuthPage && (
              <div className="pt-3 border-t border-gray-200 mt-3 space-y-2 px-2">
                {currentUser ? (
                  <>
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
                        onClick={handleCompanyProfile}
                        disabled={loadingCompanyId || !userCompanyId}
                        className="w-full flex items-center space-x-2 rtl:space-x-reverse px-4 py-3 text-gray-700 rounded-lg transition-all duration-200 font-medium text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingCompanyId ? (
                          <>
                            <div className="w-4 h-4 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                            <span>{translations?.loadingCompany || 'Loading Company...'}</span>
                          </>
                        ) : userCompanyId ? (
                          <>
                            <Building2 className="w-4 h-4" />
                            <span>{translations?.companyProfile || 'Company Profile'}</span>
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
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
```