import React, { useState } from 'react';
import { Reply, Building2, X, Send } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Review } from '../../types/property';
import { CompanyProfile as CompanyProfileType } from '../../types/companyProfile';

interface ReplyModalProps {
  review: Review;
  company: CompanyProfileType;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

const ReplyModal: React.FC<ReplyModalProps> = ({
  review,
  company,
  onClose,
  onSuccess,
  onError
}) => {
  const { currentUser } = useAuth();
  const { translations } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  // Check if user can reply (company owner or admin)
  const canReply = currentUser && (
    currentUser.role === 'admin' || 
    (currentUser.role === 'company' && company?.email === currentUser.email)
  );

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !canReply) {
      onError(translations?.noPermissionReply || 'You do not have permission to reply to this review');
      return;
    }

    if (!replyContent.trim()) {
      onError(translations?.enterReplyMessage || 'Please enter a reply message');
      return;
    }

    if (replyContent.trim().length < 10) {
      onError(translations?.replyMinLength || 'Reply must be at least 10 characters long');
      return;
    }

    try {
      setLoading(true);

      // Update review document with company reply
      const reviewRef = doc(db, 'reviews', review.id);
      await updateDoc(reviewRef, {
        companyReply: {
          content: replyContent.trim(),
          repliedAt: new Date(),
          repliedBy: currentUser.uid,
          replierName: currentUser.displayName || currentUser.email
        },
        updatedAt: new Date()
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding reply:', error);
      onError(translations?.failedToAddReply || 'Failed to add reply. Please try again.');
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

  if (!canReply) {
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <X className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {translations?.accessDenied || 'Access Denied'}
            </h3>
            <p className="text-gray-600 mb-6">
              {translations?.noPermissionReply || 'You do not have permission to reply to reviews for this company.'}
            </p>
            <button
              onClick={onClose}
              className="w-full bg-gray-300 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-400 transition-all duration-200"
            >
              {translations?.close || 'Close'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Reply className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {translations?.replyToReview || 'Reply to Review'}
              </h3>
              <p className="text-sm text-gray-600">
                {translations?.respondingAs?.replace('{company}', company.name) || `Responding as ${company.name}`}
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

        {/* Original Review */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="flex items-start space-x-4 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">
                {review.userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 rtl:space-x-reverse mb-2">
                <h4 className="font-semibold text-gray-900">{review.userName}</h4>
                <div className="flex items-center space-x-1 rtl:space-x-reverse">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={`text-sm ${
                        i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <h5 className="font-medium text-gray-800 mb-2">{review.title}</h5>
              <p className="text-gray-700 text-sm leading-relaxed">
                {review.content}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {review.createdAt.toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Reply Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Company Info Display */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                {company.logoUrl ? (
                  <img 
                    src={company.logoUrl} 
                    alt={company.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <Building2 className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {company.name}
                </p>
                <p className="text-sm text-gray-600">
                  {translations?.companyRepresentative || 'Replying as company representative'}
                </p>
              </div>
            </div>
          </div>

          {/* Reply Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {translations?.yourReply || 'Your Reply'} *
            </label>
            <textarea
              required
              rows={6}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={translations?.thankForReview || 'Thank you for your review. We appreciate your feedback and would like to address your concerns...'}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 resize-none"
              maxLength={1000}
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500">
                {translations?.charactersLimit?.replace('{current}', replyContent.length.toString()).replace('{max}', '1000') || 
                 `${replyContent.length}/1000 characters`}
              </p>
              <p className="text-xs text-gray-500">
                {translations?.minCharsRequired || 'Minimum 10 characters required'}
              </p>
            </div>
          </div>

          {/* Guidelines */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <h4 className="font-medium text-amber-900 mb-2">{translations?.replyGuidelines || 'Reply Guidelines'}</h4>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>{translations?.thankCustomer || '• Thank the customer for their feedback'}</li>
              <li>{translations?.addressConcerns || '• Address their specific concerns professionally'}</li>
              <li>{translations?.provideSolutions || '• Provide solutions or next steps if applicable'}</li>
              <li>{translations?.keepToneRespectful || '• Keep the tone respectful and constructive'}</li>
              <li>{translations?.avoidSharingPersonal || '• Avoid sharing personal information publicly'}</li>
            </ul>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-4">
            <button
              type="submit"
              disabled={loading || replyContent.trim().length < 10}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 rtl:space-x-reverse"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{translations?.sendingReply || 'Sending Reply...'}</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  <span>{translations?.sendReply || 'Send Reply'}</span>
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

export default ReplyModal;