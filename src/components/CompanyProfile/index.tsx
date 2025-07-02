import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CompanyProfile as CompanyProfileType } from '../../types/companyProfile';
import { Property } from '../../types/property';
import { Review } from '../../types/property';
import { Category } from '../../types/company';
import CompanyHeader from './CompanyHeader';
import CompanyTabs from './CompanyTabs';
import OverviewTab from './OverviewTab';
import PropertiesTab from './PropertiesTab';
import ReviewsTab from './ReviewsTab';
import WriteReviewTab from './WriteReviewTab';
import AddPropertyModal from './AddPropertyModal';
import ImageUploadModal from './ImageUploadModal';
import NotificationMessages from './NotificationMessages';

interface CompanyProfileProps {
  companyId: string | null;
  onNavigateBack: () => void;
}

const CompanyProfile: React.FC<CompanyProfileProps> = ({ companyId, onNavigateBack }) => {
  const { currentUser } = useAuth();
  const { translations, language } = useLanguage();
  const [company, setCompany] = useState<CompanyProfileType | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // Default to overview tab
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);

  // Check if user can edit (admin or company owner)
  const canEdit = currentUser && (
    currentUser.role === 'admin' || 
    (currentUser.role === 'company' && company?.email === currentUser.email)
  );
  
  // Check if user can leave a review (logged in, not company owner, not admin)
  const userCanReview = currentUser && currentUser.role === 'user';
  
  // Check if user has already reviewed this company
  const hasUserReviewed = currentUser && reviews.some(review => review.userId === currentUser.uid);

  // Load company data
  const loadCompanyData = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      
      // Load company profile
      const companyDoc = await getDoc(doc(db, 'companies', companyId));
      if (companyDoc.exists()) {
        const companyData = {
          id: companyDoc.id,
          ...companyDoc.data(),
          createdAt: companyDoc.data().createdAt?.toDate() || new Date(),
          updatedAt: companyDoc.data().updatedAt?.toDate() || new Date()
        } as CompanyProfileType;
        setCompany(companyData);
        
        // Load gallery images if they exist
        if (companyData.galleryImages) {
          setGalleryImages(companyData.galleryImages);
        }
      }

      // Load properties
      const propertiesQuery = query(
        collection(db, 'properties'),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );
      const propertiesSnapshot = await getDocs(propertiesQuery);
      const propertiesData = propertiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Property[];
      setProperties(propertiesData);

      // Load reviews
      await loadReviews();

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
  const loadReviews = async () => {
    if (!companyId) return;

    try {
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('companyId', '==', companyId),
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
      setReviews(reviewsData);

      // Update company's total rating and reviews count if company exists
      if (company && reviewsData.length > 0) {
        const averageRating = reviewsData.reduce((sum, review) => sum + review.rating, 0) / reviewsData.length;
        setCompany(prev => prev ? {
          ...prev,
          totalRating: Math.round(averageRating * 10) / 10,
          totalReviews: reviewsData.length
        } : null);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  // Handle review added
  const handleReviewAdded = async () => {
    await loadReviews();
    // Optionally reload the entire company data to get updated stats
    if (companyId) {
      const companyDoc = await getDoc(doc(db, 'companies', companyId));
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
    // Switch to reviews tab
    setActiveTab('reviews');
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
  }, [companyId]);

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
      case 'properties':
        return (
          <PropertiesTab
            properties={properties}
            canEdit={canEdit}
            setShowAddProperty={setShowAddProperty}
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

      {showAddProperty && (
        <AddPropertyModal
          company={company}
          setShowAddProperty={setShowAddProperty}
          uploadLoading={uploadLoading}
          setUploadLoading={setUploadLoading}
          setSuccess={handleSuccess}
          setError={handleError}
          loadCompanyData={loadCompanyData}
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