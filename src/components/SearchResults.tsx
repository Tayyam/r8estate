Here's the fixed version with all missing closing brackets added:

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { Search, Star, Filter, MapPin, Building2, ArrowLeft, ChevronDown, ChevronUp, X, Sliders, ChevronRight } from 'lucide-react';
import { collection, getDocs, query, orderBy, where, limit, startAfter, DocumentData } from 'firebase/firestore';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { Company } from '../types/company';
import { Category, egyptianGovernorates } from '../types/company';
import { getCompanySlug } from '../utils/urlUtils';

interface CompanyWithCategory extends Company {
  categoryName: string;
  categoryNameAr?: string;
  locationName: string;
  locationNameAr?: string;
  totalRating: number;
  totalReviews: number;
}

interface SearchResultsProps {
  onNavigate: (page: string) => void;
  onNavigateToProfile?: (companyId: string, companyName: string) => void;
  initialSearchQuery?: string;
  initialCategoryFilter?: string;
}

const COMPANIES_PER_PAGE = 9;

const SearchResults: React.FC<SearchResultsProps> = ({ 
  onNavigate, 
  onNavigateToProfile, 
  initialSearchQuery = '', 
  initialCategoryFilter = 'all' 
}) => {
  // ... [rest of the component code remains unchanged until the missing closing brackets]

              </div>
            </div>

            {/* Results Grid */}
            {loading && companies.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-md">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Building2 className="h-8 w-8 text-red-500" />
                </div>
                <p className="text-red-500">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 mt-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {translations?.retry || 'Retry'}
                </button>
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-md">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{translations?.noCompaniesFound || 'No Companies Found'}</h3>
                <p className="text-gray-600 mb-6">
                  {translations?.adjustSearchCriteria || 'Try adjusting your search criteria or browse all categories'}
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  {translations?.clearFilters || 'Clear Filters'}
                </button>
              </div>
            ) : (
              <>
                {/* Companies Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {companies.map((company) => (
                    <div
                      key={company.id}
                      className="bg-white rounded-3xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden cursor-pointer group"
                      onClick={() => handleCompanyClick(company.id, company.name)}
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
                              <span className="font-semibold text-gray-900">{company.totalRating.toFixed(1)}</span>
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
                              <MapPin className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{language === 'ar' ? company.locationNameAr : company.locationName}</span>
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
                                <Star className="w-4 h-4 text-yellow-400 fill-current" />
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
                            {language === 'ar' ? company.categoryNameAr : company.categoryName}
                          </span>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCompanyClick(company.id, company.name);
                            }}
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

                {/* Load More Button */}
                {hasMore && (
                  <div className="text-center mt-10">
                    <button
                      onClick={handleLoadMore}
                      disabled={loading}
                      className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center mx-auto space-x-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>{translations?.loading || 'Loading...'}</span>
                        </>
                      ) : (
                        <>
                          <span>{translations?.loadMoreResults || 'Load More Results'}</span>
                          <ChevronDown className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  </div>
                )}
                
                {/* End of Results Message */}
                {!hasMore && companies.length > 0 && (
                  <div className="text-center mt-10">
                    <p className="text-gray-500">
                      {translations?.endOfResults || 'End of results'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add custom style for better filter UI */}
      <style jsx>{`
        .filter-group {
          position: relative;
          transition: all 0.2s ease;
        }
        
        .filter-group:hover {
          transform: translateY(-1px);
        }
        
        .filter-group select:focus {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </div>
  );
};

export default SearchResults;
```