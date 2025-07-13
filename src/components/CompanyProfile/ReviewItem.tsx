import React, { useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Star, Shield, ChevronDown, ChevronUp, User, FileText, Image, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Review } from '../../types/property';
import { CompanyProfile as CompanyProfileType } from '../../types/companyProfile';
import ReviewVotingButtons from './ReviewVotingButtons';

interface ReviewItemProps {
  review: Review;
  company: CompanyProfileType;
  currentUser: any;
  isHighlighted?: boolean;
  onReply: (review: Review) => void;
  onEdit: (review: Review) => void;
  onDelete: (review: Review) => void;
  expandedReplies: Set<string>;
  toggleReplyExpansion: (reviewId: string) => void;
}

const ReviewItem: React.FC<ReviewItemProps> = ({
  review,
  company,
  currentUser,
  isHighlighted = false,
  onReply,
  onEdit,
  onDelete,
  expandedReplies,
  toggleReplyExpansion
}) => {
  const { translations, language } = useLanguage();

  // Handle attachment preview
  const [previewAttachment, setPreviewAttachment] = useState<{url: string; type: 'image' | 'pdf'} | null>(null);

  // Render detailed ratings if available
  const renderDetailedRatings = () => {
    if (!review.ratingDetails) return null;
    
    const ratingDetails = review.ratingDetails;
    const categories = [
      { key: 'communication', label: translations?.communication || 'Communication' },
      { key: 'valueForMoney', label: translations?.valueForMoney || 'Value for Money' },
      { key: 'friendliness', label: translations?.friendliness || 'Friendliness' },
      { key: 'responsiveness', label: translations?.responsiveness || 'Responsiveness' }
    ];
    
    return (
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        {categories.map((category) => {
          const rating = ratingDetails[category.key as keyof typeof ratingDetails] || 0;
          if (rating === 0) return null;
          
          return (
            <div key={category.key} className="flex items-center text-xs text-gray-600">
              <span>{category.label}:</span>
              <div className="flex ml-1">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-3 h-3 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Format date
  const formatDate = (date: Date) => {
    return format(date, 'PPP', { locale: language === 'ar' ? ar : undefined });
  };

  // Check if user can modify this review
  const canModifyReview = () => {
    return currentUser && (
      currentUser.uid === review.userId || 
      currentUser.role === 'admin'
    );
  };

  // Hide content if review is hidden
  if (review.hidden) {
    // Don't render anything for non-admin users when a review is hidden
    if (!currentUser || currentUser.role !== 'admin') {
      return null;
    }
    
    // For admins, show the review with a blur effect and hidden tag
    return (
      <div 
        id={`review-${review.id}`}
        className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 relative outline-none overflow-hidden group"
      >
        {/* Hidden Badge */}
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-yellow-100 text-yellow-800 text-xs font-medium px-3 py-1 rounded-full border border-yellow-200 shadow-sm">
            {translations?.hidden || 'Hidden'}
          </div>
        </div>
        
        {/* Blurred Content */}
        <div className="filter blur-[2px] hover:blur-[1px] transition-all duration-300 pointer-events-none opacity-75">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-4 rtl:space-x-reverse flex-1">
              {/* User Avatar */}
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg">
                  {review.userName.charAt(0).toUpperCase()}
                </span>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-3 rtl:space-x-reverse mb-1">
                  <h3 className="font-bold text-gray-900">{review.userName}</h3>
                  {review.verified && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 rtl:space-x-reverse">
                      <Shield className="h-3 w-3" />
                      <span>{translations?.verified || 'Verified'}</span>
                    </span>
                  )}
                  {review.isAnonymous && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                      {translations?.anonymous || 'Anonymous'}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {formatDate(review.createdAt)}
                    {review.updatedAt > review.createdAt && (
                      <span className="text-xs text-gray-500 ml-2 rtl:ml-0 rtl:mr-2">
                        {translations?.edited || '(edited)'}
                      </span>
                    )}
                  </span>
                </div>
                
                {/* Detailed Ratings */}
                {renderDetailedRatings()}
              </div>
            </div>
          </div>

          <h4 className="font-semibold text-gray-900 mb-3 text-lg">{review.title}</h4>
          <p className="text-gray-700 leading-relaxed mb-6">{review.content}</p>
          <p></p>
          {/* Attachments */}
          {review.attachments && review.attachments.length > 0 && (
            <div className="mb-6">
              <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <span>{translations?.attachments || 'Attachments'} ({review.attachments.length})</span>
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {review.attachments.map((attachment, index) => (
                  <div key={index} className="relative group">
                    <button
                      onClick={() => setPreviewAttachment(attachment)}
                      className="border rounded-lg overflow-hidden bg-gray-50 aspect-square w-full transition-all duration-200 hover:shadow-md"
                    >
                      {attachment.type === 'image' ? (
                        <img 
                          src={attachment.url} 
                          alt={attachment.name || `Attachment ${index + 1}`} 
                          className="w-full h-full object-contain p-2"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2">
                          <FileText className="h-8 w-8 text-red-500 mb-2" />
                          <span className="text-xs text-center text-gray-500 truncate max-w-full px-2">
                            {attachment.name || `Document ${index + 1}`}
                          </span>
                        </div>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
        </div>
      </div>
    );
  };
  
  // Attachment Preview Modal
  const renderAttachmentPreview = () => {
    if (!previewAttachment) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={() => setPreviewAttachment(null)}>
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-auto" onClick={(e) => e.stopPropagation()}>
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-medium text-lg">{previewAttachment.name || 'Attachment Preview'}</h3>
            <div className="flex space-x-2">
              <a 
                href={previewAttachment.url} 
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors duration-200"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
              <button 
                className="p-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors duration-200"
                onClick={() => setPreviewAttachment(null)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="p-4 flex items-center justify-center bg-gray-100" style={{ minHeight: '60vh' }}>
            {previewAttachment.type === 'image' ? (
              <img
                src={previewAttachment.url}
                alt={previewAttachment.name || "Image Attachment"}
                className="max-w-full max-h-[70vh] object-contain"
              />
            ) : (
              <iframe
                src={previewAttachment.url}
                title={previewAttachment.name || "PDF Document"}
                className="w-full h-[70vh]"
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      id={`review-${review.id}`}
      className={`bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 relative outline-none ${
        isHighlighted ? 'highlight-review' : ''
      }`}
    >
      {previewAttachment && renderAttachmentPreview()}
      
      {/* "Shared review" indicator - will be visible when accessed via direct link */}
      <div className="shared-review-indicator hidden absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-md">
        {translations?.sharedReview || 'Shared Review'}
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-3 sm:space-y-0">
        <div className="flex items-start space-x-4 rtl:space-x-reverse flex-1">
          {/* User Avatar */}
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">
              {review.userName.charAt(0).toUpperCase()}
            </span>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-3 rtl:space-x-reverse mb-1">
              <h3 className="font-bold text-gray-900">{review.userName}</h3>
              {review.verified && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 rtl:space-x-reverse">
                  <Shield className="h-3 w-3" />
                  <span>{translations?.verified || 'Verified'}</span>
                </span>
              )}
              {review.isAnonymous && (
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                  {translations?.anonymous || 'Anonymous'}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="flex items-center space-x-1 rtl:space-x-reverse">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {formatDate(review.createdAt)}
                {review.updatedAt > review.createdAt && (
                  <span className="text-xs text-gray-500 ml-2 rtl:ml-0 rtl:mr-2">
                    {translations?.edited || '(edited)'}
                  </span>
                )}
              </span>
            </div>
            
            {/* Detailed Ratings */}
            {renderDetailedRatings()}
          </div>
        </div>

        {/* Action Buttons */}
        {canModifyReview() && (
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {/* Edit Button (for review owner and admins) */}
            <button
              onClick={() => onEdit(review)}
              className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors duration-200"
              title={translations?.editReview || 'Edit Review'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                <path d="m15 5 4 4"/>
              </svg>
            </button>
            
            {/* Delete Button */}
            <button
              onClick={() => onDelete(review)}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
              title={translations?.deleteReview || 'Delete Review'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                <line x1="10" x2="10" y1="11" y2="17"/>
                <line x1="14" x2="14" y1="11" y2="17"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      <h4 className="font-semibold text-gray-900 mb-3 text-lg">{review.title}</h4>
      <p className="text-gray-700 leading-relaxed mb-6">{review.content}</p>
      
      {/* Review Voting Buttons */}
      <div className="flex justify-end mb-4">
        <ReviewVotingButtons 
          reviewId={review.id} 
          reviewUserId={review.userId} 
          contentType="review"
        />
      </div>
      
      {/* Company Reply */}
      {review.companyReply && (
        <div className="bg-gray-50 rounded-xl border-l-4 border-blue-500 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-white border-2 border-blue-500">
                  {company.logoUrl ? (
                    <img
                      src={company.logoUrl}
                      alt={company.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <span className="font-medium text-gray-900">{company.name}</span>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" x2="16" y1="2" y2="6"/>
                      <line x1="8" x2="8" y1="2" y2="6"/>
                      <line x1="3" x2="21" y1="10" y2="10"/>
                    </svg>
                    <span>{formatDate(review.companyReply.repliedAt)}</span>
                  </div>
                </div>
              </div>
              
              {/* Toggle Reply Visibility */}
              <button
                onClick={() => toggleReplyExpansion(review.id)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                {expandedReplies.has(review.id) ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>
            
            {/* Reply Content */}
            <div className={`transition-all duration-300 ${
              expandedReplies.has(review.id) ? 'block' : 'hidden'
            }`}>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">{review.companyReply.content}</p>
                
                {/* Reply Voting/Report Buttons */}
                <div className="flex justify-end">
                  <ReviewVotingButtons 
                    reviewId={review.id} 
                    reviewUserId={review.companyReply.repliedBy} 
                    contentType="reply"
                    replyId={review.id} // Using review ID as reply ID since replies are embedded
                  />
                </div>
              </div>
            </div>
            
            {!expandedReplies.has(review.id) && (
              <p className="text-gray-700 leading-relaxed">
                {review.companyReply.content.length > 100 
                  ? `${review.companyReply.content.substring(0, 100)}...`
                  : review.companyReply.content
                }
              </p>
            )}
          </div>
        </div>
      )}

      {/* Reply Button (for company owners and admins) */}
      {currentUser && 
       (currentUser.role === 'company' && currentUser.companyId === company.id && 
        !review.companyReply) && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => onReply(review)}
            className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 10 20 15 15 20"/>
              <path d="M4 4v7a4 4 0 0 0 4 4h12"/>
            </svg>
            <span>{translations?.reply || 'Reply'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewItem;