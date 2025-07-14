import React, { useState } from 'react';
import { Star, MessageSquare, User, AlertCircle, X, Edit, Upload, Paperclip, FileText, XCircle, Eye } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Review } from '../../types/property';

interface EditReviewModalProps {
  review: Review;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

interface RatingCategory {
  key: string;
  label: string;
}

const EditReviewModal: React.FC<EditReviewModalProps> = ({
  review,
  onClose,
  onSuccess,
  onError
}) => {
  const { currentUser } = useAuth();
  const { translations } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [formData, setFormData] = useState({
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
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<{ url: string; type: 'image' | 'pdf'; name: string; isNew?: boolean; }[]>(
    review.attachments?.map(att => ({ ...att, isNew: false })) || []
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const ratingCategories: RatingCategory[] = [
    { key: 'communication', label: translations?.communication || 'Communication' },
    { key: 'valueForMoney', label: translations?.valueForMoney || 'Value for Money' },
    { key: 'friendliness', label: translations?.friendliness || 'Friendliness' },
    { key: 'responsiveness', label: translations?.responsiveness || 'Responsiveness' }
  ];

  // Calculate average rating from all categories
  const calculateAverageRating = () => {
    const { communication, valueForMoney, friendliness, responsiveness } = formData.ratingDetails;
    const sum = communication + valueForMoney + friendliness + responsiveness;
    return sum > 0 ? Math.round(sum / 4) : 0;
  };

  // Star rating component
  const StarRating = ({ rating, onRatingChange }: { rating: number; onRatingChange: (rating: number) => void }) => {
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
      onError(`Some files couldn't be added: ${invalidFiles.join(', ')}`);
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
        const fileRef = ref(storage, `review-attachments/${review.companyId}/${currentUser?.uid}/${fileName}`);
        
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      onError(translations?.mustBeLoggedIn || 'You must be logged in to edit a review');
      return;
    }

    // Check for hyperlinks in title and content
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\.[a-zA-Z]{2,}\/[^\s]+)/gi;
    if (urlRegex.test(formData.title) || urlRegex.test(formData.content)) {
      onError(translations?.noHyperlinksAllowed || 'Hyperlinks are not allowed in reviews');
      return;
    }

    // Check permissions
    const canEdit = currentUser.uid === review.userId || currentUser.role === 'admin';
    if (!canEdit) {
      onError(translations?.canOnlyEditOwnReviews || 'You can only edit your own reviews');
      return;
    }

    // Check if any of the category ratings are 0
    const { communication, valueForMoney, friendliness, responsiveness } = formData.ratingDetails;
    if (communication === 0 || valueForMoney === 0 || friendliness === 0 || responsiveness === 0) {
      onError(translations?.pleaseRateAllCategories || 'Please rate all categories');
      return;
    }

    try {
      const reviewRef = doc(db, 'reviews', review.id);
      const overallRating = calculateAverageRating();
      await updateDoc(reviewRef, {
        rating: overallRating,
        ratingDetails: formData.ratingDetails,
        title: formData.title.trim(),
        content: formData.content.trim(),
        updatedAt: new Date()
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating review:', error);
      onError(translations?.failedToUpdateReview || 'Failed to update review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
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

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Edit className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {translations?.editReview || 'Edit Review'}
              </h3>
              <p className="text-sm text-gray-600">
                {translations?.updateYourReview || 'Update your review'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors duration-200"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* User Info Display */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {review.userName}
                </p>
                <p className="text-sm text-gray-600">
                  {translations?.originalReview?.replace('{date}', review.createdAt.toLocaleDateString()) || 
                   `Original review: ${review.createdAt.toLocaleDateString()}`}
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
            <label className="block text-sm font-medium text-gray-700 mb-4">
              {translations?.rateYourExperience || 'Rate Your Experience'} *
            </label>
            <div className="space-y-6">
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
            <div className="mt-4 py-4 border-t border-b border-gray-200">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {translations?.reviewTitle || 'Review Title'} *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder={translations?.summarizeExperience || 'Summarize your experience...'}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              {translations?.charactersLimit?.replace('{current}', formData.title.length.toString()).replace('{max}', '100') || 
               `${formData.title.length}/100 characters`}
            </p>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {translations?.yourReview || 'Your Review'} *
            </label>
            <textarea
              required
              rows={5}
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder={translations?.tellOthersExperience || 'Tell others about your experience with this company...'}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 mt-1">
              {translations?.charactersLimit?.replace('{current}', formData.content.length.toString()).replace('{max}', '1000') || 
               `${formData.content.length}/1000 characters`}
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-4">
            <button
              type="submit"
              disabled={loading || calculateAverageRating() === 0 || !formData.title.trim() || !formData.content.trim()}
              className="flex-1 bg-orange-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 rtl:space-x-reverse"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{translations?.updating || 'Updating...'}</span>
                </>
              ) : (
                <>
                  <Edit className="h-5 w-5" />
                  <span>{translations?.updateReview || 'Update Review'}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-400 transition-all duration-200 disabled:opacity-50"
            >
              {translations?.cancel || 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditReviewModal;