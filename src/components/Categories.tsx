import React, { useState, useEffect } from 'react';
import { Search, Star, Filter, MapPin, Calendar, Eye, Building2 } from 'lucide-react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { Company } from '../types/company';
import { Category, egyptianGovernorates } from '../types/company';

interface CompanyWithCategory extends Company {
  categoryName: string;
  categoryNameAr?: string;
  locationName: string;
  locationNameAr?: string;
  totalRating: number;
  totalReviews: number;
}

interface CategoriesProps {
  onNavigateToProfile?: (companyId: string) => void;
}

const Categories: React.FC<CategoriesProps> = ({ onNavigateToProfile }) => {
  const { translations } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [companies, setCompanies] = useState<CompanyWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load categories from Firestore
  const loadCategories = async () => {
    try {
      const categoriesQuery = query(collection(db, 'categories'), orderBy('name'));
      const categoriesSnapshot = await getDocs(categoriesQuery);
      const categoriesData = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Category[];
      
      setCategories(categoriesData);
      return categoriesData;
    } catch (error) {
      console.error('Error loading categories:', error);
      return [];
    }
  };

  // Load companies from Firestore
  const loadCompanies = async (categoriesData: Category[]) => {
    try {
      const companiesQuery = query(collection(db, 'companies'), orderBy('createdAt', 'desc'));
      const companiesSnapshot = await getDocs(companiesQuery);
      const companiesData = companiesSnapshot.docs.map(doc => {
        const data = doc.data();
        const category = categoriesData.find(cat => cat.id === data.categoryId);
        const location = egyptianGovernorates.find(gov => gov.id === data.location);
        
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          categoryName: category?.name || 'Unknown Category',
          categoryNameAr: category?.nameAr || category?.name || 'فئة غير معروفة',
          locationName: location?.name || data.location,
          locationNameAr: location?.nameAr || location?.name || data.location,
          totalRating: data.totalRating || 0,
          totalReviews: data.totalReviews || 0
        };
      }) as CompanyWithCategory[];
      
      setCompanies(companiesData);
    } catch (error) {
      console.error('Error loading companies:', error);
      setError(translations?.failedToLoadCompanies || 'Failed to load companies');
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      
      try {
        const categoriesData = await loadCategories();
        await loadCompanies(categoriesData);
      } catch (error) {
        console.error('Error loading data:', error);
        setError(translations?.failedToLoadData || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Create filter options from real data
  const filterOptions = [
    { id: 'all', name: translations?.allCategories || 'All Categories' },
    ...categories.map(category => ({
      id: category.id,
      name: translations ? (category.nameAr || category.name) : category.name
    }))
  ];

  const locationOptions = [
    { id: 'all', name: translations?.allLocations || 'All Locations' },
    ...egyptianGovernorates.map(gov => ({
      id: gov.id,
      name: translations ? gov.nameAr : gov.name
    }))
  ];

  const handleSearch = () => {
    console.log('Search:', searchQuery, 'Category:', selectedCategory, 'Location:', selectedLocation);
  };

  const handleCompanyClick = (companyId: string) => {
    if (onNavigateToProfile) {
      onNavigateToProfile(companyId);
    }
  };

  const handleViewDetails = (e: React.MouseEvent, companyId: string) => {
    e.stopPropagation();
    handleCompanyClick(companyId);
  };

  // Filter companies based on search, category, and location
  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         company.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         company.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (company.locationNameAr && company.locationNameAr.includes(searchQuery));
    
    const matchesCategory = selectedCategory === 'all' || company.categoryId === selectedCategory;
    
    const matchesLocation = selectedLocation === 'all' || company.location === selectedLocation;
    
    return matchesSearch && matchesCategory && matchesLocation;
  });

  // Get category color based on category name
  const getCategoryColor = (categoryName: string) => {
    const colors = {
      'Developer': '#194866',
      'Broker': '#EE183F',
      'Consultant': '#10B981',
      'Property Management': '#8B5CF6',
      'مطور عقاري': '#194866',
      'وسيط عقاري': '#EE183F',
      'مستشار عقاري': '#10B981',
      'إدارة الممتلكات': '#8B5CF6'
    };
    return colors[categoryName as keyof typeof colors] || '#6B7280';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{translations?.loadingCompanies || 'Loading companies...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{translations?.errorLoadingData || 'Error Loading Data'}</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            {translations?.retry || 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold mb-4" style={{ color: '#194866' }}>
              {translations?.browseAllCategories || 'Browse All Categories'}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8">
              {translations?.discoverBestCompanies || 'Discover the best real estate companies in Egypt by specialty'}
            </p>

            {/* Search and Filter */}
            <div className="bg-gray-50 rounded-2xl p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5">
                  <div className="relative">
                    <Search className="absolute left-4 rtl:right-4 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder={translations?.searchCompanies || 'Search companies...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 rtl:pr-12 rtl:pl-6 pr-6 py-4 text-gray-800 rounded-xl border border-gray-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200 bg-white"
                      style={{ 
                        focusBorderColor: '#EE183F',
                        focusRingColor: '#EE183F'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#EE183F';
                        e.target.style.boxShadow = `0 0 0 3px rgba(238, 24, 63, 0.1)`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>
                <div className="md:col-span-3">
                  <div className="relative">
                    <Filter className="absolute left-4 rtl:right-4 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full pl-12 rtl:pr-12 rtl:pl-6 pr-6 py-4 text-gray-800 rounded-xl border border-gray-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200 bg-white appearance-none cursor-pointer"
                      style={{ 
                        focusBorderColor: '#EE183F',
                        focusRingColor: '#EE183F'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#EE183F';
                        e.target.style.boxShadow = `0 0 0 3px rgba(238, 24, 63, 0.1)`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      {filterOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="relative">
                    <MapPin className="absolute left-4 rtl:right-4 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full pl-12 rtl:pr-12 rtl:pl-6 pr-6 py-4 text-gray-800 rounded-xl border border-gray-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200 bg-white appearance-none cursor-pointer"
                      style={{ 
                        focusBorderColor: '#EE183F',
                        focusRingColor: '#EE183F'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#EE183F';
                        e.target.style.boxShadow = `0 0 0 3px rgba(238, 24, 63, 0.1)`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      {locationOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <button
                    onClick={handleSearch}
                    className="w-full text-white px-6 py-4 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
                    style={{ backgroundColor: '#EE183F' }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#c71535';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#EE183F';
                    }}
                  >
                    {translations?.search || 'Search'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Companies Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {filteredCompanies.length} {translations?.companies || 'Companies'}
              </h2>
              <p className="text-gray-600 mt-1">
                {selectedCategory === 'all' 
                  ? (translations?.allCategories || 'All Categories')
                  : filterOptions.find(opt => opt.id === selectedCategory)?.name
                }
                {selectedLocation !== 'all' && (
                  <span> - {locationOptions.find(opt => opt.id === selectedLocation)?.name}</span>
                )}
              </p>
            </div>
          </div>

          {/* Companies Grid */}
          {filteredCompanies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCompanies.map((company) => (
                <div
                  key={company.id}
                  className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden cursor-pointer group"
                  onClick={() => handleCompanyClick(company.id)}
                >
                  {/* Company Image */}
                  <div className="relative h-48">
                    {company.logoUrl ? (
                      <img
                        src={company.logoUrl}
                        alt={company.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <Building2 className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    
                    {/* Verified Badge */}
                    {company.verified && (
                      <div className="absolute top-4 left-4 rtl:right-4 rtl:left-auto">
                        <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 rtl:space-x-reverse">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>{translations?.verified || 'Verified'}</span>
                        </div>
                      </div>
                    )}

                    {/* Rating Badge */}
                    {company.totalRating > 0 && (
                      <div className="absolute top-4 right-4 rtl:left-4 rtl:right-auto">
                        <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-1 rtl:space-x-reverse">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-bold text-gray-900">{company.totalRating.toFixed(1)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Company Content */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-gray-700 transition-colors">
                          {company.name}
                        </h3>
                        <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm text-gray-500 mb-3">
                          <MapPin className="w-4 h-4" />
                          <span>{translations ? company.locationNameAr : company.locationName}</span>
                        </div>
                      </div>
                    </div>

                    {company.description && (
                      <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-2">
                        {company.description.substring(0, 120)}
                        {company.description.length > 120 && '...'}
                      </p>
                    )}

                    {/* Stats Row */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4 rtl:space-x-reverse">
                        {company.totalReviews > 0 && (
                          <div className="flex items-center space-x-1 rtl:space-x-reverse">
                            <Eye className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{company.totalReviews}</span>
                            <span className="text-sm text-gray-500">{translations?.reviews || 'reviews'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Category Badge */}
                    <div className="flex items-center justify-between">
                      <span 
                        className="px-3 py-1 rounded-full text-sm font-medium text-white"
                        style={{ backgroundColor: getCategoryColor(company.categoryName) }}
                      >
                        {translations ? company.categoryNameAr : company.categoryName}
                      </span>
                      
                      <button
                        onClick={(e) => handleViewDetails(e, company.id)}
                        className="text-sm font-medium flex items-center space-x-1 rtl:space-x-reverse transition-colors duration-200 hover:scale-105"
                        style={{ color: '#194866' }}
                        onMouseEnter={(e) => {
                          e.target.style.color = '#EE183F';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.color = '#194866';
                        }}
                      >
                        <span>{translations?.viewDetails || 'View Details'}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* No Results */
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{translations?.noCompaniesFound || 'No Companies Found'}</h3>
              <p className="text-gray-600 mb-6">
                {translations?.adjustSearchCriteria || 'Try adjusting your search criteria or browse all categories'}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedLocation('all');
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                {translations?.clearFilters || 'Clear Filters'}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Categories;