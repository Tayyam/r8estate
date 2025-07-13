import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, User, AlertCircle, Edit, Upload, Paperclip, FileText, XCircle, Eye } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CompanyProfile as CompanyProfileType } from '../../types/companyProfile';
import { Review } from '../../types/property';

interface WriteReviewTabProps {
  company: CompanyProfileType;
  onReviewAdded: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

interface RatingCategory {
  key: string;
  label: string;
}

const WriteReviewTab: React.FC<WriteReviewTabProps> = ({
  company,
  onReviewAdded,
  onSuccess,
  onError
}) => {
  const { currentUser } = useAuth();
  const { translations } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [formData, setFormData] = useState({
    rating: 0,
    title: '',
    content: '',
    isAnonymous: false,
    ratingDetails: {
      communication: 0,
      valueForMoney: 0,
      friendliness: 0,
      responsiveness: 0
    },
    attachments: [] as { url: string; type: 'image' | 'pdf'; name: string; }[]
  });
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<{ url: string; type: 'image' | 'pdf'; name: string; isNew?: boolean; }[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const ratingCategories: RatingCategory[] = [
    { key: 'communication', label: translations?.communication || 'Communication' },
    { key: 'valueForMoney', label: translations?.valueForMoney || 'Value for Money' },
    { key: 'friendliness', label: translations?.friendliness || 'Friendliness' },
    { key: 'responsiveness', label: translations?.responsiveness || 'Responsiveness' }
  ];

  // Check if user has already reviewed this company
  useEffect(() => {
    const checkExistingReview = async () => {
      if (!currentUser) return;
      
      try {
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('companyId', '==', company.id),
          where('userId', '==', currentUser.uid)
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);
        
        if (!reviewsSnapshot.empty) {
          const reviewData = reviewsSnapshot.docs[0].data();
          const review = {
            id: reviewsSnapshot.docs[0].id,
            ...reviewData,
            createdAt: reviewData.createdAt?.toDate() || new Date(),
            updatedAt: reviewData.updatedAt?.toDate() || new Date(),
            companyReply: reviewData.companyReply ? {
              ...reviewData.companyReply,
              repliedAt: reviewData.companyReply.repliedAt?.toDate() || new Date()
            } : undefined
          } as Review;
          
          setUserReview(review);
          
          // Set form data for editing
          setFormData({
            rating: review.rating,
            title: review.title,
            content: review.content,
            isAnonymous: review.isAnonymous || false,
            ratingDetails: review.ratingDetails || {
              communication: 0,
              valueForMoney: 0,
              friendliness: 0,
              responsiveness: 0
            },
            attachments: review.attachments || []
          });
        }
      } catch (error) {
        console.error('Error checking existing review:', error);
      }
    };
    
    checkExistingReview();
  }, [currentUser, company.id]);

  // Calculate average rating from all categories
  const calculateAverageRating = () => {
    const { communication, valueForMoney, friendliness, responsiveness } = formData.ratingDetails;
    const sum = communication + valueForMoney + friendliness + responsiveness;
    return sum > 0 ? Math.round(sum / 4) : 0;
  };

  // Handle file selection for attachments
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const selectedFiles = Array.from(e.target.files);
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    // Check file types and sizes
    selectedFiles.forEach(file => {
      // Check if it's an image or PDF
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';
      
      if (!isImage && !isPDF) {
        invalidFiles.push(`${file.name} (Invalid format)`);
        return;
      }
      
      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        invalidFiles.push(`${file.name} (File too large)`);
        return;
      }
      
      // Maximum 5 files total
      if (previewUrls.length + validFiles.length >= 5) {
        invalidFiles.push(`${file.name} (Maximum 5 files exceeded)`);
        return;
      }
      
      validFiles.push(file);
      
      // Create preview URL
      const fileType = isImage ? 'image' : 'pdf';
      const url = URL.createObjectURL(file);
      setPreviewUrls(prev => [...prev, { url, type: fileType, name: file.name, isNew: true }]);
    });

    if (invalidFiles.length > 0) {
      onError(translations?.someFilesCouldNotBeAdded || `Some files couldn't be added: ${invalidFiles.join(', ')}`);
    }

    setFiles(prev => [...prev, ...validFiles]);
  };

  // Remove a file from the list
  const removeFile = (index: number) => {
    const file = previewUrls[index];
    
    // If it's a new file (not yet uploaded)
    if (file.isNew) {
      const newFileIndex = previewUrls.filter(p => p.isNew).findIndex(p => p.url === file.url);
      if (newFileIndex !== -1) {
        setFiles(prev => {
          const newFiles = [...prev];
          newFiles.splice(newFileIndex, 1);
          return newFiles;
        });
      }
    } else {
      // It's an existing attachment, mark it for removal from formData
      setFormData(prev => ({
        ...prev,
        attachments: prev.attachments.filter(att => att.url !== file.url)
      }));
    }
    
    setPreviewUrls(prev => {
      const newPreviewUrls = [...prev];
      if (file.isNew) URL.revokeObjectURL(newPreviewUrls[index].url);
      newPreviewUrls.splice(index, 1);
      return newPreviewUrls;
    });
  };

  // Upload attachments to Firebase Storage
  const uploadAttachments = async (): Promise<{ url: string; type: 'image' | 'pdf'; name: string; }[]> => {
    if (files.length === 0) return [];
    
    try {
      setUploadingAttachments(true);
      const uploadPromises = files.map(async (file) => {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name.replace(/\s+/g, '_')}`;
        const fileRef = ref(storage, `review-attachments/${company.id}/${currentUser?.uid}/${fileName}`);
        
        await uploadBytes(fileRef, file);
        const downloadUrl = await getDownloadURL(fileRef);
        
        const isImage = file.type.startsWith('image/');
        return {
          url: downloadUrl,
          type: isImage ? 'image' as const : 'pdf' as const,
          name: file.name
        };
      });
      
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading attachments:', error);
      throw error;
    } finally {
      setUploadingAttachments(false);
    }
  };

  // Star rating component
  const StarRating = ({ 
    rating, 
    onRatingChange 
  }: { 
    rating: number; 
    onRatingChange: (rating: number) => void 
  }) => {
    const [hoverRating, setHoverRating] = useState(0);

    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-1 rounded transition-all duration-200 hover:scale-110"
          >
            <Star
              className={`w-6 h-6 transition-all duration-200 ${
                star <= (hoverRating || rating)
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300 hover:text-yellow-200'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600 font-medium">
          {rating > 0 ? `${rating} / 5` : (translations?.selectRating || 'Select rating')}
        </span>
      </div>
    );
  };

  // Update company's average rating in Firestore
  const updateCompanyRating = async () => {
    try {
      // Get all reviews for this company
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('companyId', '==', company.id)
      );
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const allReviews = reviewsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      const averageRating = allReviews.length > 0 
        ? allReviews.reduce((sum: number, review: any) => sum + review.rating, 0) / allReviews.length 
        : 0;
      
      const roundedRating = Math.round(averageRating * 10) / 10; // Round to 1 decimal place
      
      const companyRef = doc(db, 'companies', company.id);
      await updateDoc(companyRef, {
        totalRating: roundedRating,
        rating: roundedRating, // Also update the rating field
        totalReviews: allReviews.length,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating company rating:', error);
    }
  };

  // Handle add review submission
  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      onError(translations?.mustBeLoggedIn || 'You must be logged in to add a review');
      return;
    }

    // Check if any of the category ratings are 0
    const { communication, valueForMoney, friendliness, responsiveness } = formData.ratingDetails;
    if (communication === 0 || valueForMoney === 0 || friendliness === 0 || responsiveness === 0) {
      onError(translations?.pleaseRateAllCategories || 'Please rate all categories');
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      onError(translations?.pleaseFillAllFields || 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);

      // Upload new attachments if any
      let newAttachments: { url: string; type: 'image' | 'pdf'; name: string; }[] = [];
      if (files.length > 0) {
        try {
          newAttachments = await uploadAttachments();
        } catch (error) {
          onError(translations?.failedToUploadAttachments || 'Failed to upload attachments');
          setLoading(false);
          return;
        }
      }

      // Calculate average rating
      const overallRating = calculateAverageRating();

      // Add review to Firestore
      await addDoc(collection(db, 'reviews'), {
        companyId: company.id,
        userId: currentUser.uid,
        userName: formData.isAnonymous ? (translations?.anonymousUser || 'Anonymous User') : (currentUser.displayName || currentUser.email),
        userEmail: currentUser.email,
        rating: overallRating,
        ratingDetails: formData.ratingDetails,
        title: formData.title.trim(),
        content: formData.content.trim(),
        isAnonymous: formData.isAnonymous,
        attachments: newAttachments,
        verified: currentUser.role === 'admin', // Admins are auto-verified
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Update company's rating and review count
      await updateCompanyRating();

      onSuccess(translations?.reviewAddedSuccess || 'Review added successfully!');
      onReviewAdded();
      
      // Reload the review to get the edit mode working
      const checkExistingReview = async () => {
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('companyId', '==', company.id),
          where('userId', '==', currentUser.uid)
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);
        
        if (!reviewsSnapshot.empty) {
          const reviewData = reviewsSnapshot.docs[0].data();
          const review = {
            id: reviewsSnapshot.docs[0].id,
            ...reviewData,
            createdAt: reviewData.createdAt?.toDate() || new Date(),
            updatedAt: reviewData.updatedAt?.toDate() || new Date(),
            companyReply: reviewData.companyReply ? {
              ...reviewData.companyReply,
              repliedAt: reviewData.companyReply.repliedAt?.toDate() || new Date()
            } : undefined
          } as Review;
          
          setUserReview(review);
        }
      };
      
      checkExistingReview();
      
    } catch (error: any) {
      console.error('Error adding review:', error);
      onError(translations?.failedToAddReview || 'Failed to add review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit review submission
  const handleEditReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !userReview) {
      onError(translations?.mustBeLoggedIn || 'You must be logged in to edit a review');
      return;
    }

    // Check if any of the category ratings are 0
    const { communication, valueForMoney, friendliness, responsiveness } = formData.ratingDetails;
    if (communication === 0 || valueForMoney === 0 || friendliness === 0 || responsiveness === 0) {
      onError(translations?.pleaseRateAllCategories || 'Please rate all categories');
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      onError(translations?.pleaseFillAllFields || 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);

      // Upload new attachments if any
      let newAttachments: { url: string; type: 'image' | 'pdf'; name: string; }[] = [];
      if (files.length > 0) {
        try {
          newAttachments = await uploadAttachments();
        } catch (error) {
          onError(translations?.failedToUploadAttachments || 'Failed to upload attachments');
          setLoading(false);
          return;
        }
      }

      // Combine existing (not removed) attachments with new ones
      const combinedAttachments = [...formData.attachments, ...newAttachments];

      // Calculate average rating
      const overallRating = calculateAverageRating();

      // Update review in Firestore
      const reviewRef = doc(db, 'reviews', userReview.id);
      await updateDoc(reviewRef, {
        rating: overallRating,
        ratingDetails: formData.ratingDetails,
        title: formData.title.trim(),
        content: formData.content.trim(),
        isAnonymous: formData.isAnonymous,
        attachments: combinedAttachments,
        updatedAt: new Date()
      });

      // Update company's rating
      await updateCompanyRating();
      
      // Update local state
      setUserReview({
        ...userReview,
        rating: overallRating,
        ratingDetails: formData.ratingDetails,
        title: formData.title.trim(),
        content: formData.content.trim(),
        isAnonymous: formData.isAnonymous,
        updatedAt: new Date()
      });

      onSuccess(translations?.reviewUpdatedSuccess || 'Review updated successfully!');
      onReviewAdded();
    } catch (error: any) {
      console.error('Error updating review:', error);
      onError(translations?.failedToUpdateReview || 'Failed to update review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle rating changes for a specific category
  const handleCategoryRatingChange = (category: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      ratingDetails: {
        ...prev.ratingDetails,
        [category]: value
      }
    }));
  };

  // If user is not logged in
  if (!currentUser) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-8 text-center">
        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {translations?.loginToReview || 'Please log in to write a review'}
        </h2>
        <p className="text-gray-600 mb-6">
          {translations?.loginToReviewDesc || 'You need to be logged in to share your experience with this company.'}
        </p>
      </div>
    );
  }
  
  // If the user has already written a review
  const isEditing = userReview !== null;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isEditing 
            ? (translations?.editReview || 'Edit Review') 
            : (translations?.writeReview || 'Write a Review')}
        </h2>
        <p className="text-gray-600">
          {isEditing
            ? (translations?.updateYourReview || 'Update your review of this company')
            : (translations?.shareExperienceWith?.replace('{company}', company.name) || 
               `Share your experience with ${company.name}`)}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={isEditing ? handleEditReview : handleAddReview} className="space-y-8">
        {/* User Info Display */}
        <div className="bg-gray-50 rounded-xl p-6">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              {currentUser?.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={currentUser.displayName || ''}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {currentUser?.displayName || currentUser?.email}
              </p>
              <p className="text-sm text-gray-600">
                {isEditing 
                  ? (translations?.originalReview?.replace('{date}', userReview.createdAt.toLocaleDateString()) || 
                     `Original review: ${userReview.createdAt.toLocaleDateString()}`)
                  : (translations?.reviewingAs?.replace('{role}', currentUser?.role || 'user') || 
                     `Reviewing as: ${currentUser?.role || 'user'}`)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              id="anonymous"
              checked={formData.isAnonymous}
              onChange={(e) => handleInputChange('isAnonymous', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="anonymous" className="ml-2 block text-sm text-gray-700">
              {translations?.postAnonymously || 'Post anonymously'}
              <span className="text-xs text-gray-500 block mt-1">
                {translations?.adminCanSeeIdentity || '(Only platform administrators can see your identity)'}
              </span>
            </label>
          </div>
        </div>

        {/* Rating Categories */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {translations?.rateYourExperience || 'Rate Your Experience'} *
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ratingCategories.map((category) => (
              <div key={category.key} className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-800">
                    {category.label}
                  </h4>
                  <span className="text-sm text-gray-500">
                    {formData.ratingDetails[category.key as keyof typeof formData.ratingDetails] > 0 
                      ? `${formData.ratingDetails[category.key as keyof typeof formData.ratingDetails]}/5` 
                      : ''}
                  </span>
                </div>
                <StarRating 
                  rating={formData.ratingDetails[category.key as keyof typeof formData.ratingDetails]} 
                  onRatingChange={(rating) => handleCategoryRatingChange(category.key, rating)} 
                />
              </div>
            ))}
          </div>
          <div className="mt-6 py-4 border-t border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-800">
                {translations?.overallRating || 'Overall Rating'}
              </h4>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={`w-5 h-5 ${
                      star <= calculateAverageRating() 
                        ? 'text-yellow-400 fill-current' 
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {calculateAverageRating() > 0 ? `${calculateAverageRating()}/5` : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-lg font-semibold text-gray-900 mb-2">
            {translations?.reviewTitle || 'Review Title'} *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder={translations?.summarizeExperience || 'Summarize your experience...'}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
            maxLength={100}
          />
          <p className="text-xs text-gray-500 mt-1">
            {translations?.charactersLimit?.replace('{current}', formData.title.length.toString()).replace('{max}', '100') || 
             `${formData.title.length}/100 characters`}
          </p>
        </div>

        {/* Content */}
        <div>
          <label className="block text-lg font-semibold text-gray-900 mb-2">
            {translations?.yourReview || 'Your Review'} *
          </label>
          <textarea
            required
            rows={6}
            value={formData.content}
            onChange={(e) => handleInputChange('content', e.target.value)}
            placeholder={translations?.tellOthersExperience || 'Tell others about your experience with this company. What did you like? What could be improved?'}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 resize-none"
            maxLength={1000}
          />
          <p className="text-xs text-gray-500 mt-1">
            {translations?.charactersLimit?.replace('{current}', formData.content.length.toString()).replace('{max}', '1000') || 
             `${formData.content.length}/1000 characters`}
          </p>
        </div>
        
        {/* File Attachments */}
        <div>
          <label className="block text-lg font-semibold text-gray-900 mb-2 flex items-center justify-between">
            <div className="flex items-center">
              <Paperclip className="h-5 w-5 mr-2" />
              <span>{translations?.attachments || 'Attachments'}</span>
            </div>
            <span className="text-xs text-gray-500">{translations?.maxFiles || 'Max 5 files'} (JPG, PNG, PDF)</span>
          </label>
          
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-gray-400 transition-all duration-200">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,application/pdf"
              multiple
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 flex flex-col items-center"
              disabled={previewUrls.length >= 5}
            >
              <Upload className="h-10 w-10 text-gray-400 mb-3" />
              <span className="text-gray-600">{translations?.dragDropFiles || 'Drag & drop files here, or click to browse'}</span>
              <span className="text-sm text-gray-500 mt-2">{translations?.maxFileSize || 'Max 5MB per file'}</span>
            </button>
          </div>
          
          {/* File Preview */}
          {previewUrls.length > 0 && (
            <div className="mt-6 space-y-4">
              <h4 className="text-lg font-medium text-gray-900">
                {translations?.selectedFiles || 'Selected Files'} ({previewUrls.length}/5)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {previewUrls.map((file, index) => (
                  <div key={index} className="relative group">
                    <div className="border rounded-lg overflow-hidden bg-gray-50 aspect-square shadow-sm">
                      {file.type === 'image' ? (
                        <img 
                          src={file.url} 
                          alt={file.name} 
                          className="w-full h-full object-contain p-2"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2">
                          <FileText className="h-10 w-10 text-red-500 mb-2" />
                          <span className="text-xs text-center text-gray-500 truncate max-w-full px-2">{file.name}</span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm"
                      title={translations?.removeFile || "Remove file"}
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Guidelines */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-start space-x-3 rtl:space-x-reverse">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-2">{translations?.reviewGuidelines || 'Review Guidelines'}</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>{translations?.beHonestConstructive || '• Be honest and constructive in your feedback'}</li>
                <li>{translations?.focusPersonalExperience || '• Focus on your personal experience'}</li>
                <li>{translations?.keepRespectful || '• Keep it respectful and professional'}</li>
                <li>{translations?.avoidPersonalInfo || '• Avoid sharing personal information'}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={loading || uploadingAttachments || !calculateAverageRating() || !formData.title.trim() || !formData.content.trim()}
            className="w-full sm:w-auto text-white py-4 px-8 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 rtl:space-x-reverse shadow-lg hover:shadow-xl"
            style={{ backgroundColor: isEditing ? '#f97316' : '#194866' }}
            onMouseEnter={(e) => {
              if (!loading && calculateAverageRating() !== 0 && formData.title.trim() && formData.content.trim()) {
                e.target.style.backgroundColor = isEditing ? '#ea580c' : '#0f3147';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = isEditing ? '#f97316' : '#194866';
            }}
          >
            {loading || uploadingAttachments ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>
                  {uploadingAttachments 
                    ? (translations?.uploadingAttachments || 'Uploading attachments...')
                    : (translations?.submitting || 'Submitting...')
                  }
                </span>
              </>
            ) : (
              <>
                {isEditing ? <Edit className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                <span>
                  {isEditing 
                    ? (translations?.updateReview || 'Update Review')
                    : (translations?.submitReview || 'Submit Review')}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WriteReviewTab;