import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Star, Building2, MessageSquare, Eye, LayoutGrid, Calendar } from 'lucide-react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CompanyProfile as CompanyProfileType } from '../../types/companyProfile';
import { Property } from '../../types/property';
import { Review } from '../../types/property';
import { Category } from '../../types/company';
import CompanyTabs from './CompanyTabs';
import OverviewTab from './OverviewTab';
import ReviewsTab from './ReviewsTab';
import ProjectsTab from './ProjectsTab';
import CompanyHeader from './CompanyHeader';
import ImageUploadModal from './ImageUploadModal';
import NotificationMessages from './NotificationMessages';
import { getCompanySlug } from '../../utils/urlUtils';

interface CompanyProfileProps {
  companyId?: string | null;
  onNavigateBack: () => void;
}

const CompanyProfile: React.FC<CompanyProfileProps> = ({ companyId, onNavigateBack }) => {
  const { currentUser } = useAuth();
  const { translations } = useLanguage();
  const params = useParams<{ companySlug: string; companyId: string; tab: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyProfileType | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(params.tab || 'overview');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);

  // Update URL when tab changes
  useEffect(() => {
    if (company && activeTab && params.tab !== activeTab) {
      const companySlug = getCompanySlug(company.name);
      
      // Get existing query parameters if any
      const searchParams = new URLSearchParams(location.search);
      
      navigate(`/company/${companySlug}/${company.id}/${activeTab}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`, { replace: true });
    }
  }, [activeTab, company, navigate, params.tab]);

  // Check if user can edit (admin or company owner)
  const canEdit = currentUser && (
    currentUser.role === 'admin' || 
    (currentUser.role === 'company' && company && currentUser.companyId === company.id)
  );
  
  // Check if user can leave a review (logged in, not company owner, not admin)
  const userCanReview = currentUser && currentUser.role === 'user';
  
  // Check if user has already reviewed this company
  const hasUserReviewed = currentUser && reviews.some(review => review.userId === currentUser.uid);

  // Load company data
  const loadCompanyData = async () => {
    // Use companyId from URL params if available, otherwise use the prop
    const actualCompanyId = params.companyId || companyId;
    if (!actualCompanyId) return;

    try {
      setLoading(true);
      // Load company profile by ID
      const companyDoc = await getDoc(doc(db, 'companies', actualCompanyId));
      if (companyDoc.exists()) {
        const companyData = {
          id: companyDoc.id,
          ...companyDoc.data(),
          createdAt: companyDoc.data().createdAt?.toDate() || new Date(),
          updatedAt: companyDoc.data().updatedAt?.toDate() || new Date()
        } as CompanyProfileType;
        
        setCompany(companyData);
        
        // If URL slug doesn't match company name, update it
        const correctSlug = getCompanySlug(companyData.name);
        if (params.companySlug !== correctSlug) {
          navigate(`/company/${correctSlug}/${actualCompanyId}/${activeTab || 'overview'}`, { replace: true });
          return;
        }
        
        // Load gallery images if they exist
        if (companyData.galleryImages) {
          setGalleryImages(companyData.galleryImages);
        }
      }

        // Load reviews
        await loadReviews(actualCompanyId);

      // Load categories
      const categoriesSnapshot = await getDocs(collection(db, 'categories'));
      const categoriesData = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Category[];
      setCategories(categoriesData);

    } catch (error) {
      console.error('Error loading company data:', error);
      setError(translations?.failedToLoadCompany || 'Failed to load company data');
    } finally {
      setLoading(false);
    }
  };

  // Load reviews separately to allow refreshing after adding new review
  const loadReviews = async (companyIdToLoad: string) => {
    if (!companyIdToLoad) return [];

    try {
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('companyId', '==', companyIdToLoad),
        orderBy('createdAt', 'desc')
      );
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const reviewsData = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        companyReply: doc.data().companyReply ? {
          ...doc.data().companyReply,
          repliedAt: doc.data().companyReply.repliedAt?.toDate() || new Date()
        } : undefined
      })) as Review[];
      
      // Put current user's review at the top
      if (currentUser) {
        const sortedReviews = [...reviewsData].sort((a, b) => {
          if (a.userId === currentUser.uid) return -1;
          if (b.userId === currentUser.uid) return 1;
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
        setReviews(sortedReviews);
      } else {
        setReviews(reviewsData);
      }

      // Update company's total rating and reviews count if company exists
      if (company && reviewsData.length > 0) {
        const averageRating = reviewsData.reduce((sum, review) => sum + review.rating, 0) / reviewsData.length;
        setCompany(prev => prev ? {
          ...prev,
          totalRating: Math.round(averageRating * 10) / 10,
          totalReviews: reviewsData.length
        } : null);
      }
      
      return reviewsData;
    } catch (error) {
      console.error('Error loading reviews:', error);
      return [];
    }
  };

  // Handle review added
  const handleReviewAdded = async () => {
    const actualCompanyId = params.companyId || companyId;
    if (actualCompanyId) {
      const updatedReviews = await loadReviews(actualCompanyId);
      
      // Optionally reload the entire company data to get updated stats
      const companyDoc = await getDoc(doc(db, 'companies', actualCompanyId));
      if (companyDoc.exists()) {
        const updatedCompanyData = {
          id: companyDoc.id,
          ...companyDoc.data(),
          createdAt: companyDoc.data().createdAt?.toDate() || new Date(),
          updatedAt: companyDoc.data().updatedAt?.toDate() || new Date()
        } as CompanyProfileType;
        setCompany(updatedCompanyData);
      }
    }
  };

  // Show success message
  const handleSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  };

  // Show error message  
  const handleError = (message: string) => {
    setError(message);
    setTimeout(() => setError(''), 3000);
  };

  useEffect(() => {
    loadCompanyData();
  }, [params.companyId, companyId, params.companySlug]);

  // Update active tab when URL tab param changes
  useEffect(() => {
    if (params.tab) {
      setActiveTab(params.tab);
    }
    
    // Check if there's a specific review to scroll to
    const searchParams = new URLSearchParams(location.search);
    const highlightedReviewId = searchParams.get('review');
    
    if (highlightedReviewId && params.tab === 'reviews') {
      setTimeout(() => {
        const reviewElement = document.getElementById(`review-${highlightedReviewId}`);
        if (reviewElement) {
          // Scroll to the element with offset to center it in the viewport
          const elementRect = reviewElement.getBoundingClientRect();
          const absoluteElementTop = elementRect.top + window.pageYOffset;
          const middle = absoluteElementTop - (window.innerHeight / 3);
          window.scrollTo({
            top: middle,
            behavior: 'smooth'
          });
          
          // Add a highlight class that will fade out
          reviewElement.classList.add('highlight-review');
          
          // Temporarily move focus to the review for accessibility
          reviewElement.setAttribute('tabindex', '-1');
          reviewElement.focus();
          
          // Remove the highlight effect after some time
          setTimeout(() => {
            reviewElement.classList.remove('highlight-review');
            reviewElement.classList.add('highlight-review-fading');
            setTimeout(() => {
              reviewElement.classList.remove('highlight-review-fading');
              reviewElement.removeAttribute('tabindex');
            }, 2500);
          }, 2500);
        }
      }, 500);
    }
  }, [params.tab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            {translations?.companyNotFound || 'Company Not Found'}
          </h2>
          <button
            onClick={onNavigateBack}
            className="text-blue-600 hover:text-blue-800"
          >
            {translations?.goBack || 'Go Back'}
          </button>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab
            company={company}
            galleryImages={galleryImages}
            setGalleryImages={setGalleryImages}
            canEdit={canEdit}
            setShowImageUpload={setShowImageUpload}
            uploadLoading={uploadLoading}
            setUploadLoading={setUploadLoading}
            setSuccess={handleSuccess}
            setError={handleError}
            categories={categories}
          />
        );
      case 'reviews':
        return (
          <ReviewsTab 
            reviews={reviews} 
            company={company}
            onReviewAdded={handleReviewAdded}
            onSuccess={handleSuccess}
            onError={handleError}
            userCanReview={userCanReview}
            hasUserReviewed={hasUserReviewed}
            currentUser={currentUser}
          />
        );
      case 'projects':
        return (
          <ProjectsTab
            company={company}
            canEdit={canEdit}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationMessages error={error} success={success} />

      <CompanyHeader
        company={company}
        setCompany={setCompany}
        properties={properties}
        reviews={reviews}
        categories={categories}
        canEdit={canEdit}
        uploadLoading={uploadLoading}
        setUploadLoading={setUploadLoading}
        setSuccess={handleSuccess}
        setError={handleError}
        onNavigateBack={onNavigateBack}
      />

      <CompanyTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        company={company}
        categories={categories}
        properties={properties}
        reviews={reviews}
        userCanReview={userCanReview && !hasUserReviewed}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>

      {showImageUpload && (
        <ImageUploadModal
          company={company}
          galleryImages={galleryImages}
          setGalleryImages={setGalleryImages}
          setShowImageUpload={setShowImageUpload}
          uploadLoading={uploadLoading}
          setUploadLoading={setUploadLoading}
          setSuccess={handleSuccess}
          setError={handleError}
        />
      )}


      {userCanReview && !hasUserReviewed && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={() => {
              const writeReviewSection = document.getElementById('write-review-section');
              if (writeReviewSection) {
                writeReviewSection.scrollIntoView({ behavior: 'smooth' });
              } else {
                setActiveTab('reviews');
              }
            }}
            className="flex items-center space-x-2 rtl:space-x-reverse px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <span>{translations?.writeReview || 'Write a Review'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CompanyProfile;