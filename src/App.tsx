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

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState({
    query: '',
    category: 'all'
  });

  // Listen for company profile navigation from Header
  useEffect(() => {
    const handleCompanyProfileNavigation = (event: CustomEvent) => {
      const { companyId } = event.detail;
      setSelectedCompanyId(companyId);
      navigate(`/company/${companyId}/overview`);
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

  return (
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
          <div className="min-h-screen bg-gray-50">
            {shouldShowHeaderFooter && (
              <Header 
                currentPage={location.pathname.split('/')[1] || 'home'} 
                setCurrentPage={handleNavigate} 
              />
            )}
            <main>
              <Routes>
                <Route path="/" element={<Hero onNavigate={handleNavigate} />} />
                <Route path="/categories" element={<Categories onNavigateToProfile={(companyId) => {
                  setSelectedCompanyId(companyId);
                  navigate(`/company/${companyId}/overview`);
                }} />} />
                <Route path="/categories/:categoryId" element={<Categories onNavigateToProfile={(companyId) => {
                  setSelectedCompanyId(companyId);
                  navigate(`/company/${companyId}/overview`);
                }} />} />
                <Route path="/about" element={<About />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/contact" element={<Contact onNavigate={handleNavigate} />} />
                <Route path="/terms" element={<Terms onNavigate={handleNavigate} />} />
                <Route path="/privacy" element={<Privacy onNavigate={handleNavigate} />} />
                <Route path="/admin/settings" element={<Settings onNavigateToProfile={(companyId) => {
                  setSelectedCompanyId(companyId);
                  navigate(`/company/${companyId}/overview`);
                }} />} />
                <Route path="/login" element={<Login onNavigate={handleNavigate} />} />
                <Route path="/register" element={<Register onNavigate={handleNavigate} />} />
                <Route path="/company/:companyId/:tab" element={
                  <CompanyProfile 
                    companyId={selectedCompanyId} 
                    onNavigateBack={() => navigate(-1)} 
                  />
                } />
                <Route path="/profile" element={<PersonalProfile onNavigate={handleNavigate} />} />
                <Route path="/profile/reviews" element={<MyReviews onNavigate={handleNavigate} />} />
                <Route path="/search" element={
                  <SearchResults 
                    onNavigate={handleNavigate} 
                    onNavigateToProfile={(companyId) => {
                      setSelectedCompanyId(companyId);
                      navigate(`/company/${companyId}/overview`);
                    }}
                    initialSearchQuery={searchParams.query}
                    initialCategoryFilter={searchParams.category}
                  />
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            {shouldShowHeaderFooter && <Footer onNavigate={handleNavigate} />}
            <NotificationContainer />
          </div>
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;