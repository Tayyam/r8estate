import React, { useState, useEffect } from 'react';
import { Building2, Star } from 'lucide-react';
import { collection, getDocs, query, orderBy, where, limit, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCompanySlug } from '../../utils/urlUtils';

interface TopCompaniesProps {
  onNavigateToProfile?: (companyId: string, companyName: string) => void;
}

const TopCompanies: React.FC<TopCompaniesProps> = ({ onNavigateToProfile }) => {
  const { translations, language } = useLanguage();
  const navigate = useNavigate();
  const [topRatedCompanies, setTopRatedCompanies] = useState<any[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companiesError, setCompaniesError] = useState<string | null>(null);

  // Fetch top-rated companies from Firestore
  useEffect(() => {
    const fetchTopRatedCompanies = async () => {
      setCompaniesLoading(true);
      setCompaniesError(null);
      
      try {
        // First try to get companies with ratings
        let companiesQuery = query(
          collection(db, 'companies'),
          orderBy('rating', 'desc'), // Order by rating descending
          limit(3) // Limit to 3 companies
        );
        
        let companiesSnapshot = await getDocs(companiesQuery);
        
        // If no companies found with this query, try getting any companies
        if (companiesSnapshot.empty) {
          companiesQuery = query(
            collection(db, 'companies'),
            orderBy('createdAt', 'desc'), // Order by creation date instead
            limit(3) // Still limit to 3 companies
          );
          
          companiesSnapshot = await getDocs(companiesQuery);
        }
        
        if (companiesSnapshot.empty) {
          // Still no companies found
          setTopRatedCompanies([]);
          setCompaniesLoading(false);
          return;
        }
        
        const companiesData = companiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          // Ensure totalRating has a value
          totalRating: doc.data().totalRating || doc.data().rating || 0,
          totalReviews: doc.data().totalReviews || 0
        }));
        
        // Fetch category info for each company
        const companiesWithCategories = await Promise.all(
          companiesData.map(async (company) => {
            let categoryName = "Unknown";
            
            if (company.categoryId) {
              try {
                const categoryDoc = await getDoc(doc(db, 'categories', company.categoryId));
                if (categoryDoc.exists()) {
                  const categoryData = categoryDoc.data();
                  categoryName = language === 'ar' ? (categoryData.nameAr || categoryData.name) : categoryData.name;
                }
              } catch (err) {
                console.error('Error fetching category for company:', err);
                // Continue with "Unknown" category
              }
            }
            
            return {
              ...company,
              categoryName
            };
          })
        );
        
        setTopRatedCompanies(companiesWithCategories);
      } catch (error) {
        console.error('Error fetching top rated companies:', error);
        setCompaniesError('Failed to load companies');
        setTopRatedCompanies([]);
      } finally {
        setCompaniesLoading(false);
      }
    };
    
    fetchTopRatedCompanies();
  }, [language]);

  // Handle company click
  const handleCompanyClick = (companyId: string, companyName: string) => {
    // Format company name for URL
    const companySlug = getCompanySlug(companyName);
    
    if (onNavigateToProfile) {
      // Dispatch event to navigate to company profile
      const event = new CustomEvent('navigateToCompanyProfile', {
        detail: { companyId, companyName }
      });
      window.dispatchEvent(event);
    } else {
      navigate(`/company/${companySlug}/${companyId}/overview`);
    }
  };

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
          {translations?.topRatedCompanies || 'Top Rated Companies'}
        </h2>

        {companiesLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : companiesError ? (
          <div className="text-center py-12">
            <p className="text-red-500">{companiesError}</p>
          </div>
        ) : topRatedCompanies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {topRatedCompanies.map((company) => (
              <div
                key={company.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden cursor-pointer"
                onClick={() => handleCompanyClick(company.id, company.name)}
              >
                {/* Company Image - Try logo first, then cover image, then fallback */}
                <div className="w-full h-48 overflow-hidden">
                  {company.logoUrl ? (
                    <img
                      src={company.logoUrl}
                      alt={company.name}
                      className="w-full h-full object-contain p-4 bg-gray-50"
                    />
                  ) : company.coverImageUrl ? (
                    <img
                      src={company.coverImageUrl}
                      alt={company.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center">
                      <Building2 className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 text-sm font-medium rounded-full" style={{ backgroundColor: 'rgba(25, 72, 102, 0.1)', color: '#194866' }}>
                      {company.categoryName}
                    </span>
                    <div className="flex items-center space-x-1 rtl:space-x-reverse">
                      <Star className="w-5 h-5 text-yellow-400 fill-current" />
                      <span className="font-semibold text-gray-900">{company.totalRating?.toFixed(1) || '0.0'}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{company.name}</h3>
                  <p className="text-gray-600">
                    {company.totalReviews || 0} {translations?.reviews || 'reviews'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500">
              {translations?.noCompaniesFound || 'No top rated companies found'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default TopCompanies;