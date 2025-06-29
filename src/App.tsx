import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Header from './components/Header';
import Hero from './components/Hero';
import Categories from './components/Categories';
import About from './components/About';
import Pricing from './components/Pricing';
import Contact from './components/Contact';
import Settings from './components/Settings';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import CompanyProfile from './components/CompanyProfile';
import PersonalProfile from './components/PersonalProfile';
import Footer from './components/Footer';
import NotificationContainer from './components/UI/NotificationContainer';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Listen for company profile navigation from Header
  useEffect(() => {
    const handleCompanyProfileNavigation = (event: CustomEvent) => {
      const { companyId } = event.detail;
      setSelectedCompanyId(companyId);
      setCurrentPage('company-profile');
    };

    window.addEventListener('navigateToCompanyProfile', handleCompanyProfileNavigation as EventListener);
    
    return () => {
      window.removeEventListener('navigateToCompanyProfile', handleCompanyProfileNavigation as EventListener);
    };
  }, []);

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'categories':
        return <Categories 
          onNavigateToProfile={(companyId) => {
            setSelectedCompanyId(companyId);
            setCurrentPage('company-profile');
          }}
        />;
      case 'about':
        return <About />;
      case 'pricing':
        return <Pricing />;
      case 'contact':
        return <Contact onNavigate={setCurrentPage} />;
      case 'settings':
        return <Settings onNavigateToProfile={(companyId) => {
          setSelectedCompanyId(companyId);
          setCurrentPage('company-profile');
        }} />;
      case 'personal-profile':
        return <PersonalProfile onNavigate={setCurrentPage} />;
      case 'login':
        return <Login onNavigate={setCurrentPage} />;
      case 'register':
        return <Register onNavigate={setCurrentPage} />;
      case 'company-profile':
        return <CompanyProfile 
          companyId={selectedCompanyId} 
          onNavigateBack={() => setCurrentPage('categories')}
        />;
      case 'home':
      default:
        return <Hero />;
    }
  };

  const shouldShowHeaderFooter = !['login', 'register'].includes(currentPage);

  return (
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
          <div className="min-h-screen bg-gray-50">
            {shouldShowHeaderFooter && (
              <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
            )}
            <main>
              {renderCurrentPage()}
            </main>
            {shouldShowHeaderFooter && <Footer onNavigate={setCurrentPage} />}
            <NotificationContainer />
          </div>
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;