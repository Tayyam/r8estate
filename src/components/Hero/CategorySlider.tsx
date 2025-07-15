import React, { useState, useEffect } from 'react';
import { Building2, ArrowLeft, ArrowRight } from 'lucide-react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Category } from '../../types/company';

// Import Swiper components
import { Swiper, SwiperSlide } from 'swiper/react';
// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

interface CategorySliderProps {
  onCategorySelect?: (categoryId: string) => void;
}

const CategorySlider: React.FC<CategorySliderProps> = ({ onCategorySelect }) => {
  const { translations, language } = useLanguage();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [slidesPerView, setSlidesPerView] = useState(4);

  // Update slides per view based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setSlidesPerView(1);
      } else if (window.innerWidth < 768) {
        setSlidesPerView(2);
      } else if (window.innerWidth < 1024) {
        setSlidesPerView(3);
      } else if (window.innerWidth < 1280) {
        setSlidesPerView(4);
      } else {
        setSlidesPerView(4); // Show 4 per row
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load categories from Firestore
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoryLoading(true);
        const categoriesQuery = query(
          collection(db, 'categories'),
          orderBy('name') // Removed limit to show all categories
        );
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        })) as Category[];
        
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setCategoryLoading(false);
      }
    };
    
    loadCategories();
  }, []);

  // Handle category selection
  const handleCategoryClick = (categoryId: string) => {
    if (onCategorySelect) {
      onCategorySelect(categoryId);
    } else {
      navigate(`/categories/${categoryId}`);
    }
    
    // Dispatch event to navigate with category filter
    const event = new CustomEvent('navigateToCompaniesWithCategory', {
      detail: { categoryId }
    });
    window.dispatchEvent(event);
  };

  // Get color for category based on index
  const getCategoryColor = (index: number) => {
    const colors = [
      { bg: 'rgba(25, 72, 102, 0.1)', text: '#194866' },
      { bg: 'rgba(238, 24, 63, 0.1)', text: '#EE183F' },
      { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981' },
      { bg: 'rgba(139, 92, 246, 0.1)', text: '#8B5CF6' },
      { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B' }
    ];
    
    return colors[index % colors.length];
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
          {translations?.browseByCategory || 'Browse by Category'}
        </h2>
        
        {categoryLoading ? (
          <div className="flex justify-center items-center h-60">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : categories.length > 0 ? (
          <div className="relative categories-slider px-10">
            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              spaceBetween={20}
              slidesPerView={slidesPerView}
              grid={{
                rows: 2,
                fill: "row"
              }}
              navigation={{
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
              }}
              pagination={{ 
                clickable: true,
                el: '.swiper-pagination'
              }}
              autoplay={{
                delay: 5000,
                disableOnInteraction: false,
              }}
              className="pb-12"
            >
              {categories.map((category, index) => {
                const color = getCategoryColor(index);
                return (
                  <SwiperSlide key={category.id}>
                    <div
                      className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 text-center transition-all duration-300 hover:scale-105 cursor-pointer h-full"
                      style={{ 
                        '--hover-bg': color.bg,
                        '--hover-border': color.text
                      }}
                      onClick={() => handleCategoryClick(category.id)}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = color.bg;
                        e.target.style.borderColor = color.text;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#f9fafb';
                        e.target.style.borderColor = '#e5e7eb';
                      }}
                    >
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: color.bg }}>
                        {category.iconUrl ? (
                          <img 
                            src={category.iconUrl} 
                            alt={category.name}
                            className="w-8 h-8" 
                          />
                        ) : (
                          <Building2 className="w-8 h-8" style={{ color: color.text }} />
                        )}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">
                        {language === 'ar' ? (category.nameAr || category.name) : category.name}
                      </h3>
                      {category.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {language === 'ar' ? (category.descriptionAr || category.description) : category.description}
                        </p>
                      )}
                      <div className="flex items-center justify-center font-medium" style={{ color: color.text }}>
                        <span>{translations?.explore || 'Explore'}</span>
                        <ArrowRight className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0" />
                      </div>
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
            {/* Custom Navigation Arrows */}
            <div className="swiper-button-prev absolute left-0 top-1/2 transform -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors duration-200">
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </div>
            <div className="swiper-button-next absolute right-0 top-1/2 transform -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors duration-200">
              <ArrowRight className="h-5 w-5 text-gray-700" />
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {translations?.noCategoriesFound || 'No categories found'}
            </p>
          </div>
        )}
      </div>

      {/* Custom styles for swiper navigation */}
      <style jsx global>{`
        .swiper-button-next::after,
        .swiper-button-prev::after {
          content: '';
          display: none !important;
        }
        
        .swiper-button-prev,
        .swiper-button-next {
          width: 40px !important;
          height: 40px !important;
          margin-top: -20px !important;
          transition: all 0.2s ease;
        }
        
        .swiper-button-prev:hover,
        .swiper-button-next:hover {
          background: #f3f4f6 !important;
          transform: scale(1.05);
        }
        
        .swiper-button-disabled {
          opacity: 0.3 !important;
          cursor: not-allowed !important;
        }
        
        /* RTL support */
        html[dir="rtl"] .swiper-button-next {
          right: auto !important;
          left: 0 !important;
        }
        
        html[dir="rtl"] .swiper-button-prev {
          left: auto !important;
          right: 0 !important;
        }
                
        /* RTL support */
        html[dir="rtl"] .swiper-button-next {
          right: auto !important;
          left: 0 !important;
        }
        
        html[dir="rtl"] .swiper-button-prev {
          left: auto !important;
          right: 0 !important;
        }
                
        @media (max-width: 640px) {
          .categories-slider {
            padding-left: 0;
            padding-right: 0;
          }
        }
      `}</style>
    </section>
  );
};

export default CategorySlider;