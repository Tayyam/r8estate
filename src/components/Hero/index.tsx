import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import GoogleOneTap from '../GoogleOneTap';
import HeroSection from './HeroSection';
import CategorySlider from './CategorySlider';
import TopCompanies from './TopCompanies';
import LatestReviews from './LatestReviews';

interface HeroProps {
  onNavigate?: (page: string) => void;
  onCategorySelect?: (categoryId: string) => void;
  onSearch?: (query: string, category: string) => void;
}

const Hero: React.FC<HeroProps> = ({ onNavigate, onCategorySelect, onSearch }) => {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Only show GoogleOneTap if user is not logged in */}
      {!currentUser && <GoogleOneTap />}
      
      {/* Hero Section with Search */}
      <HeroSection 
        onNavigate={onNavigate} 
        onSearch={onSearch} 
      />

      {/* Browse by Category Section */}
      <CategorySlider 
        key={`category-slider-${language}`}
        onCategorySelect={onCategorySelect}
      />

      {/* Top Rated Companies Section */}
      <TopCompanies 
        onNavigateToProfile={onNavigate}
      />

      {/* Latest Reviews Section */}
      <LatestReviews />
    </div>
  );
};

export default Hero;