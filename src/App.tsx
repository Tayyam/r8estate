import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Header from './components/Header';
import Hero from './components/Hero';
import Categories from './components/Categories';
import About from './components/About';
import Pricing from './components/Pricing';
import Contact from './components/Contact';
import Terms from './components/Terms';
import Privacy from './components/Privacy';
import Settings from './components/Settings';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import CompanyProfile from './components/CompanyProfile';
import PersonalProfile from './components/PersonalProfile';
import MyReviews from './components/MyReviews';
import SearchResults from './components/SearchResults';
import Footer from './components/Footer';
import NotificationContainer from './components/UI/NotificationContainer';
import { getCompanySlug } from './utils/urlUtils';
import { useAuth } from './contexts/AuthContext';
import SuspendedUserView from './components/SuspendedUserView';

// CheckUserStatus component that redirects suspended users
const CheckUserStatus: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  
  if (currentUser?.status === 'suspended') {
    return <SuspendedUserView />;
  }
  
  return <>{children}</>;
};

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState({
    query: '',
    category: 'all'
  });

  // Listen for company profile navigation from Header
  useEffect(() => {
    const handleCompanyProfileNavigation = (event: CustomEvent) => {
      const { companyId, companyName } = event.detail;
      setSelectedCompanyId(companyId);
      
      // Format company name for URL
      const companySlug = companyName ? getCompanySlug(companyName) : companyId;
      navigate(`/company/${companySlug}/${companyId}/overview`);
    };

    window.addEventListener('navigateToCompanyProfile', handleCompanyProfileNavigation as EventListener);
    
    // Listen for navigation to categories with filter
    const handleCategoriesWithFilter = (event: CustomEvent) => {
      const { categoryId } = event.detail;
      setSelectedCategoryId(categoryId);
      navigate(`/categories/${categoryId}`);
    };

    window.addEventListener('navigateToCompaniesWithCategory', handleCategoriesWithFilter as EventListener);
    
    // Listen for search navigation
    const handleSearchNavigation = (event: CustomEvent) => {
      const { query, category } = event.detail;
      setSearchParams({ query, category });
      navigate(`/search?q=${encodeURIComponent(query || '')}&category=${category || 'all'}`);
    };

    window.addEventListener('navigateToSearch', handleSearchNavigation as EventListener);
    
    return () => {
      window.removeEventListener('navigateToCompanyProfile', handleCompanyProfileNavigation as EventListener);
      window.removeEventListener('navigateToCompaniesWithCategory', handleCategoriesWithFilter as EventListener);
      window.removeEventListener('navigateToSearch', handleSearchNavigation as EventListener);
    };
  }, [navigate]);

  const shouldShowHeaderFooter = !location.pathname.includes('/login') && !location.pathname.includes('/register');

  const handleNavigate = (page: string) => {
    switch (page) {
      case 'home':
        navigate('/');
        break;
      case 'categories':
        navigate('/categories');
        break;
      case 'about':
        navigate('/about');
        break;
      case 'pricing':
        navigate('/pricing');
        break;
      case 'contact':
        navigate('/contact');
        break;
      case 'terms':
        navigate('/terms');
        break;
      case 'privacy':
        navigate('/privacy');
        break;
      case 'settings':
        navigate('/admin/settings');
        break;
      case 'personal-profile':
        navigate('/profile');
        break;
      case 'my-reviews':
        navigate('/profile/reviews');
        break;
      case 'login':
        navigate('/login');
        break;
      case 'register':
        navigate('/register');
        break;
      case 'search-results':
        navigate(`/search?q=${encodeURIComponent(searchParams.query || '')}&category=${searchParams.category || 'all'}`);
        break;
      default:
        navigate('/');
    }
  };

  // Check if user is suspended
  if (currentUser?.status === 'suspended') {
    // Only allow login page for suspended users
    if (!location.pathname.includes('/login')) {
      return <SuspendedUserView />;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        currentPage={location.pathname.split('/')[1] || 'home'} 
        setCurrentPage={handleNavigate} 
      />
      <main>
        <Routes>
          <Route path="/" element={
            <CheckUserStatus>
              <Hero onNavigate={handleNavigate} />
            </CheckUserStatus>
          } />
          <Route path="/categories" element={
            <CheckUserStatus>
              <Categories onNavigateToProfile={(companyId, companyName) => {
                setSelectedCompanyId(companyId);
                const companySlug = companyName ? getCompanySlug(companyName) : companyId;
                navigate(`/company/${companySlug}/${companyId}/overview`);
              }} />
            </CheckUserStatus>
          } />
          <Route path="/categories/:categoryId" element={
            <CheckUserStatus>
              <Categories onNavigateToProfile={(companyId, companyName) => {
                setSelectedCompanyId(companyId);
                const companySlug = companyName ? getCompanySlug(companyName) : companyId;
                navigate(`/company/${companySlug}/${companyId}/overview`);
              }} />
            </CheckUserStatus>
          } />
          <Route path="/about" element={
            <CheckUserStatus>
              <About />
            </CheckUserStatus>
          } />
          <Route path="/pricing" element={
            <CheckUserStatus>
              <Pricing />
            </CheckUserStatus>
          } />
          <Route path="/contact" element={
            <CheckUserStatus>
              <Contact onNavigate={handleNavigate} />
            </CheckUserStatus>
          } />
          <Route path="/terms" element={
            <CheckUserStatus>
              <Terms onNavigate={handleNavigate} />
            </CheckUserStatus>
          } />
          <Route path="/privacy" element={
            <CheckUserStatus>
              <Privacy onNavigate={handleNavigate} />
            </CheckUserStatus>
          } />
          <Route path="/admin/settings" element={
            <CheckUserStatus>
              <Settings onNavigateToProfile={(companyId, companyName) => {
                setSelectedCompanyId(companyId);
                const companySlug = companyName ? getCompanySlug(companyName) : companyId;
                navigate(`/company/${companySlug}/${companyId}/overview`);
              }} />
            </CheckUserStatus>
          } />
          <Route path="/login" element={<Login onNavigate={handleNavigate} />} />
          <Route path="/register" element={<Register onNavigate={handleNavigate} />} />
          <Route path="/company/:companySlug/:companyId/:tab" element={
            <CheckUserStatus>
              <CompanyProfile onNavigateBack={() => navigate(-1)} />
            </CheckUserStatus>
          } />
          <Route path="/profile" element={
            <CheckUserStatus>
              <PersonalProfile onNavigate={handleNavigate} />
            </CheckUserStatus>
          } />
          <Route path="/profile/reviews" element={
            <CheckUserStatus>
              <MyReviews onNavigate={handleNavigate} />
            </CheckUserStatus>
          } />
          <Route path="/search" element={
            <CheckUserStatus>
              <SearchResults 
                onNavigate={handleNavigate} 
                onNavigateToProfile={(companyId, companyName) => {
                  setSelectedCompanyId(companyId);
                  const companySlug = companyName ? getCompanySlug(companyName) : companyId;
                  navigate(`/company/${companySlug}/${companyId}/overview`);
                }}
                initialSearchQuery={searchParams.query}
                initialCategoryFilter={searchParams.category}
              />
            </CheckUserStatus>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {/* Only conditionally show the Footer */}
      {shouldShowHeaderFooter && <Footer onNavigate={handleNavigate} />}
      <NotificationContainer />
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;