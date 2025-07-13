import React, { useState, useRef } from 'react';
import { Search, Building2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { Category } from '../../types/company';

interface HeroSectionProps {
  onNavigate?: (page: string) => void;
  onSearch?: (query: string, category: string) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate, onSearch }) => {
  const { translations, language } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Handle search form submission
  const handleSearch = () => {
    setShowSuggestions(false);
    if (onSearch) {
      onSearch(searchQuery, selectedCategory);
    } else {
      navigate(`/search?q=${encodeURIComponent(searchQuery || '')}&category=${selectedCategory || 'all'}`);
    }
  };

  // Handle share experience button click
  const handleShareExperience = () => {
    if (onNavigate) {
      onNavigate('search-results');
    } else {
      navigate('/search');
    }
  };

  // Handle clicks outside search suggestions
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <section style={{ backgroundColor: '#EFF5FF' }}>
    
    </section>
  );
};

export default HeroSection;