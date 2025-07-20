import React, { useState } from 'react';
import { Star, MessageSquare, User, AlertCircle, X, Upload, Paperclip, FileText, Image, XCircle, Eye } from 'lucide-react';
import TrustpilotStars from '../UI/TrustpilotStars';
import { collection, addDoc, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CompanyProfile as CompanyProfileType } from '../../types/companyProfile';

interface AddReviewModalProps {
  company: CompanyProfileType;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

interface RatingCategory {
  key: string;
  label: string;
}

const AddReviewModal: React.FC<AddReviewModalProps> = ({
  company,
  onClose,
  onSuccess,
  onError
}) => {
  const { currentUser } = useAuth();
  const { translations } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [formData, setFormData] = useState({
    rating: 0,
    title: '',
    content: '',
    isAnonymous: false,
    attachments: [] as { url: string; type: 'image' | 'pdf'; name: string; }[]
  });
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<{ url: string; type: 'image' | 'pdf'; name: string; }[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
      <div className="flex flex-col items-center space-y-3">
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
        </div>
        {rating > 0 && (
          <TrustpilotStars rating={rating} size="medium" />
        )}
        <span className="text-sm text-gray-600 font-medium">
          {rating > 0 ? `${rating} / 5` : (translations?.selectRating || 'Select rating')}
        </span>
      </div>
    );
  };

  // Update company's average rating in Firestore
  const updateCompanyRating = async () => {
    try {
      // Get all reviews for this company to calculate accurate average
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
      if (files.length + validFiles.length >= 5) {
        invalidFiles.push(`${file.name} (Maximum 5 files exceeded)`);
        return;
      }
      
      validFiles.push(file);
      
      // Create preview URL
      const fileType = isImage ? 'image' : 'pdf';
      const url = URL.createObjectURL(file);
      setPreviewUrls(prev => [...prev, { url, type: fileType, name: file.name }]);
    });

    if (invalidFiles.length > 0) {
      onError(`Some files couldn't be added: ${invalidFiles.join(', ')}`);
    }

    setFiles(prev => [...prev, ...validFiles]);
  };

  // Remove a file from the list
  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      return newFiles;
    });
    
    setPreviewUrls(prev => {
      const newPreviewUrls = [...prev];
      URL.revokeObjectURL(newPreviewUrls[index].url);
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      onError(translations?.mustBeLoggedIn || 'You must be logged in to add a review');
      return;
    }

    // Check for hyperlinks in title and content
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\.[a-zA-Z]{2,}\/[^\s]+)/gi;
    if (urlRegex.test(formData.title) || urlRegex.test(formData.content)) {
      onError(translations?.noHyperlinksAllowed || 'Hyperlinks are not allowed in reviews');
      return;
    }

    if (formData.rating === 0) {
      onError(translations?.pleaseSelectRating || 'Please select a rating');
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      onError(translations?.pleaseFillAllFields || 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);

      // Upload attachments if any
      let attachments: { url: string; type: 'image' | 'pdf'; name: string; }[] = [];
      if (files.length > 0) {
        try {
          attachments = await uploadAttachments();
        } catch (error) {
          onError(translations?.failedToUploadAttachments || 'Failed to upload attachments');
          setLoading(false);
          return;
        }
      }

      // Add review to Firestore
      await addDoc(collection(db, 'reviews'), {
        companyId: company.id,
        userId: currentUser.uid,
        userName: formData.isAnonymous ? (translations?.anonymousUser || 'Anonymous User') : (currentUser.displayName || currentUser.email),
        userEmail: currentUser.email,
        rating: formData.rating,
        title: formData.title.trim(),
        content: formData.content.trim(),
        isAnonymous: formData.isAnonymous,
        attachments: attachments,
        verified: currentUser.role === 'admin', // Admins are auto-verified
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Update company's rating and review count
      await updateCompanyRating();

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding review:', error);
      onError(translations?.failedToAddReview || 'Failed to add review. Please try again.');
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

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {translations?.addReviewTitle || 'Add Review'}
              </h3>
              <p className="text-sm text-gray-600">
                {translations?.shareExperienceWith?.replace('{company}', company.name) || `Share your experience with ${company.name}`}
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
                {currentUser?.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName}
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
                  {translations?.reviewingAs?.replace('{role}', currentUser?.role || 'user') || `Reviewing as: ${currentUser?.role}`}
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

          {/* Overall Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              {translations?.rateYourExperience || 'Rate Your Experience'} *
            </label>
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-800">
                  {translations?.overallRating || 'Overall Rating'}
                </h4>
                <span className="text-sm text-gray-500">
                  {formData.rating > 0 ? `${formData.rating.toFixed(1)}/5.0` : ''}
                </span>
              </div>
              <div className="mt-4">
                <StarRating 
                  rating={formData.rating} 
                  onRatingChange={(rating) => setFormData(prev => ({ ...prev, rating }))} 
                />
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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              {translations?.charactersLimit?.replace('{current}', formData.title.length.toString()).replace('{max}', '100') || `${formData.title.length}/100 characters`}
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
              placeholder={translations?.tellOthersExperience || 'Tell others about your experience with this company. What did you like? What could be improved?'}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 mt-1">
              {translations?.charactersLimit?.replace('{current}', formData.content.length.toString()).replace('{max}', '1000') || `${formData.content.length}/1000 characters`}
            </p>
          </div>
          
          {/* File Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
              <div className="flex items-center">
                <Paperclip className="h-4 w-4 mr-1" />
                <span>{translations?.attachments || 'Attachments'}</span>
              </div>
              <span className="text-xs text-gray-500">{translations?.maxFiles || 'Max 5 files'} (JPG, PNG, PDF)</span>
            </label>
            
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-gray-400 transition-all duration-200">
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
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-gray-500">{translations?.dragDropFiles || 'Drag & drop files here, or click to browse'}</span>
                <span className="text-xs text-gray-400 mt-1">{translations?.maxFileSize || 'Max 5MB per file'}</span>
              </button>
            </div>
            
            {/* File Preview */}
            {previewUrls.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-700">
                  {translations?.selectedFiles || 'Selected Files'} ({previewUrls.length}/5)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {previewUrls.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="border rounded-lg overflow-hidden bg-gray-50 aspect-square">
                        {file.type === 'image' ? (
                          <img 
                            src={file.url} 
                            alt={file.name} 
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2">
                            <FileText className="h-8 w-8 text-red-500 mb-2" />
                            <span className="text-xs text-center text-gray-500 truncate max-w-full px-2">{file.name}</span>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm"
                      >
                        <XCircle className="h-4 w-4" />
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

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-4">
            <button
              type="submit"
              disabled={loading || uploadingAttachments || !formData.rating || !formData.title.trim() || !formData.content.trim()}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 rtl:space-x-reverse"
            >
              {loading || uploadingAttachments ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{uploadingAttachments ? (translations?.uploadingAttachments || 'Uploading attachments...') : (translations?.submitting || 'Submitting...')}</span>
                </>
              ) : (
                <>
                  <MessageSquare className="h-5 w-5" />
                  <span>{translations?.submitReview || 'Submit Review'}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading || uploadingAttachments}
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

export default AddReviewModal;