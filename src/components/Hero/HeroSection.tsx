import React, { useState, useRef, useEffect } from 'react';
import { Search, Building2, ArrowRight, Star, ChevronDown, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Category } from '../../types/company';

interface HeroSectionProps {
  onNavigate?: (page: string) => void;
  onSearch?: (query: string, category: string) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate, onSearch }) => {
  const { translations, language } = useLanguage();
  const navigate = useNavigate();
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [clearButtonVisible, setClearButtonVisible] = useState(false);
  
  // Category dropdown state
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  // Refs for click outside handling
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  
  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const categoriesQuery = query(
          collection(db, 'categories'),
          orderBy('name'),
          limit(10)
        );
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        })) as Category[];
        
        setCategories(categoriesData);
        setFilteredCategories(categoriesData);
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([]);
        setFilteredCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };
    
    fetchCategories();
  }, []);
  
  // Filter categories based on search query
  useEffect(() => {
    if (categorySearchQuery.trim() === '') {
      setFilteredCategories(categories);
    } else {
      const filtered = categories.filter(category =>
        category.name?.toLowerCase().includes(categorySearchQuery.toLowerCase()) || 
        (category.nameAr && category.nameAr.toLowerCase().includes(categorySearchQuery.toLowerCase()))
      );
      setFilteredCategories(filtered);
    }
  }, [categorySearchQuery, categories]);
  
  // Show/hide clear button based on search query
  useEffect(() => {
    if (searchQuery) {
      setClearButtonVisible(true);
    } else {
      setClearButtonVisible(false);
    }
  }, [searchQuery]);

  // Handle search suggestions
  const fetchSearchSuggestions = async (searchQueryText: string) => {
    if (!searchQueryText.trim() || searchQueryText.length < 2) {
      setSuggestionsLoading(false);
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setSuggestionsLoading(true);
    setShowSuggestions(true);
    
    try {
      const companiesQuery = searchQueryText.length >= 3 
        ? query(
            collection(db, 'companies'),
            where('name', '>=', searchQueryText),
            where('name', '<=', searchQueryText + '\uf8ff'),
            limit(5)
          )
        : query(
            collection(db, 'companies'),
            orderBy('name'),
            limit(5)
          );
          
      const companiesSnapshot = await getDocs(companiesQuery);
      const suggestionsData = companiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setSearchSuggestions(suggestionsData);
    } catch (error) {
      console.error('Error fetching search suggestions:', error);
      setSearchSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };
  
  // Debounced search suggestions
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timer = setTimeout(() => {
        fetchSearchSuggestions(searchQuery);
      }, 300);
      
      return () => clearTimeout(timer);
    } else {
      setShowSuggestions(false);
      setSearchSuggestions([]);
    }
  }, [searchQuery]);
  
  // Handle clicks outside search suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close search suggestions
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
        && !searchContainerRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
      
      // Check if click is within search container but outside suggestions
      if (searchContainerRef.current?.contains(event.target as Node) && !suggestionsRef.current?.contains(event.target as Node)) {
      }
      
      // Close category dropdown
      if (
        categoryDropdownRef.current && 
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
        setCategorySearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle search form submission
  const handleSearch = () => {
    setShowSuggestions(false);
    if (onSearch) {
      onSearch(searchQuery, selectedCategory);
    } else {
      // Create URL with parameters
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('q', searchQuery);
      }
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      navigate(`/search?${params.toString()}`);
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

  // Handle clear search button click
  const handleClearSearch = () => {
    setSearchQuery('');
    setShowSuggestions(false);
  };
  
  // Handle category dropdown toggle
  const handleCategoryDropdownToggle = () => {
    setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
    if (isCategoryDropdownOpen) {
      setCategorySearchQuery('');
    }
  };
  
  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setIsCategoryDropdownOpen(false);
    setCategorySearchQuery('');
  };
  
  // Get selected category name
  const getSelectedCategoryName = () => {
    if (selectedCategory === 'all') return translations?.allCategories || 'All Categories';
    const category = categories.find(cat => cat.id === selectedCategory);
    return language === 'ar' 
      ? (category?.nameAr || category?.name || translations?.allCategories || 'All Categories')
      : (category?.name || translations?.allCategories || 'All Categories');
  };
  
  // Format review count for display
  const formatReviewCount = (count: number) => {
    if (count >= 1000) {
      return `${Math.floor(count / 1000)}K`;
    }
    return count.toString();
  };

  return (
    <section className="relative bg-gradient-to-br from-blue-50 to-gray-50 py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6" style={{ color: '#194866' }}>
            {translations?.heroTitle || 'منصة تقييم القطاع العقاري الأولى في مصر'}
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-2">
            {translations?.heroSubtitle || 'اكتشف وقيم أفضل العقارات والمطورين في مصر. تقييمات حقيقية من عملاء حقيقيين'}
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;