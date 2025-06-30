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
  const [currentPage, setCurrentPage] = useState('home');
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
      setCurrentPage('company-profile');
    };

    window.addEventListener('navigateToCompanyProfile', handleCompanyProfileNavigation as EventListener);
    
    // Listen for navigation to categories with filter
    const handleCategoriesWithFilter = (event: CustomEvent) => {
      const { categoryId } = event.detail;
      setSelectedCategoryId(categoryId);
      setCurrentPage('companies-by-category'); // New page for filtered companies
    };

    window.addEventListener('navigateToCompaniesWithCategory', handleCategoriesWithFilter as EventListener);
    
    // Listen for search navigation
    const handleSearchNavigation = (event: CustomEvent) => {
      const { query, category } = event.detail;
      setSearchParams({ query, category });
      setCurrentPage('search-results');
    };

    window.addEventListener('navigateToSearch', handleSearchNavigation as EventListener);
    
    return () => {
      window.removeEventListener('navigateToCompanyProfile', handleCompanyProfileNavigation as EventListener);
      window.removeEventListener('navigateToCompaniesWithCategory', handleCategoriesWithFilter as EventListener);
      window.removeEventListener('navigateToSearch', handleSearchNavigation as EventListener);
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
          initialCategoryFilter={selectedCategoryId}
        />;
      case 'companies-by-category':
        // This is a new case to handle when a user clicks on a category
        // It will use the existing Companies component from before our changes
        // We'd need to implement this component if needed
        return <CategoriesWithCompanies 
          categoryId={selectedCategoryId}
          onNavigateToProfile={(companyId) => {
            setSelectedCompanyId(companyId);
            setCurrentPage('company-profile');
          }}
        />;
      case 'search-results':
        return <SearchResults 
          onNavigate={setCurrentPage} 
          onNavigateToProfile={(companyId) => {
            setSelectedCompanyId(companyId);
            setCurrentPage('company-profile');
          }}
          initialSearchQuery={searchParams.query}
          initialCategoryFilter={searchParams.category}
        />;
      case 'about':
        return <About />;
      case 'pricing':
        return <Pricing />;
      case 'contact':
        return <Contact onNavigate={setCurrentPage} />;
      case 'terms':
        return <Terms onNavigate={setCurrentPage} />;
      case 'privacy':
        return <Privacy onNavigate={setCurrentPage} />;
      case 'settings':
        return <Settings onNavigateToProfile={(companyId) => {
          setSelectedCompanyId(companyId);
          setCurrentPage('company-profile');
        }} />;
      case 'personal-profile':
        return <PersonalProfile onNavigate={setCurrentPage} />;
      case 'my-reviews':
        return <MyReviews onNavigate={setCurrentPage} />;
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
        return <Hero 
          onNavigate={setCurrentPage} 
          onCategorySelect={(categoryId) => {
            setSelectedCategoryId(categoryId);
          }}
          onSearch={(query, category) => {
            setSearchParams({ query, category });
            setCurrentPage('search-results');
          }}
        />;
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

// Placeholder for the companies by category component
// In a real implementation, we would create this as a separate file
const CategoriesWithCompanies = ({ categoryId, onNavigateToProfile }: { categoryId: string | null, onNavigateToProfile: (id: string) => void }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="text-center bg-white rounded-xl p-8 shadow-md">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#194866' }}>
          Companies in this Category
        </h2>
        <p className="text-gray-600 mb-6">
          This is a placeholder for the companies list filtered by category ID: {categoryId}
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

export default App;