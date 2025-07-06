import React, { useState } from 'react';
import { X, Flag, Send, AlertCircle } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';

interface ReportModalProps {
  contentId: string;
  contentType: 'review' | 'reply';
  onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({
  contentId,
  contentType,
  onClose
}) => {
  const { currentUser } = useAuth();
  const { translations } = useLanguage();
  const { showSuccessToast, showErrorToast } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    reason: '',
    details: ''
  });

  const reportReasons = [
    { value: 'spam', label: translations?.reportReasonSpam || 'Spam' },
    { value: 'inappropriate', label: translations?.reportReasonInappropriate || 'Inappropriate Content' },
    { value: 'fake', label: translations?.reportReasonFake || 'Fake Review' },
    { value: 'offensive', label: translations?.reportReasonOffensive || 'Offensive Content' },
    { value: 'other', label: translations?.reportReasonOther || 'Other' }
  ];

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      showErrorToast(
        translations?.error || 'Error',
        translations?.mustBeLoggedIn || 'You must be logged in to report content'
      );
      return;
    }

    if (!formData.reason) {
      showErrorToast(
        translations?.error || 'Error',
        translations?.selectReportReason || 'Please select a reason for reporting'
      );
      return;
    }

    try {
      setLoading(true);
      
      // Create report document in Firestore
      await addDoc(collection(db, 'reports'), {
        contentId,
        contentType,
        reporterId: currentUser.uid,
        reporterName: currentUser.displayName,
        reporterEmail: currentUser.email,
        reason: formData.reason,
        details: formData.details.trim(),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      showSuccessToast(
        translations?.reportSubmitted || 'Report Submitted',
        translations?.reportSubmittedDesc || 'Thank you for your report. Our team will review it shortly.'
      );
      
      onClose();
    } catch (error) {
      console.error('Error submitting report:', error);
      showErrorToast(
        translations?.error || 'Error',
        translations?.failedToSubmitReport || 'Failed to submit report. Please try again.'
      );
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

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Flag className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {translations?.reportContent || 'Report Content'}
              </h3>
              <p className="text-sm text-gray-600">
                {translations?.reportContentDesc || 'Report inappropriate or misleading content'}
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
          {/* Report Guidelines */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-start space-x-3 rtl:space-x-reverse">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-2">{translations?.reportGuidelines || 'Report Guidelines'}</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>{translations?.reportGuidelinesItem1 || '• Reports are anonymous to other users'}</li>
                  <li>{translations?.reportGuidelinesItem2 || '• Our team will review your report within 24-48 hours'}</li>
                  <li>{translations?.reportGuidelinesItem3 || '• False reports may result in account restrictions'}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Report Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {translations?.reportReason || 'Reason for Report'} *
            </label>
            <select
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all duration-200"
            >
              <option value="">{translations?.selectReason || 'Select a reason'}</option>
              {reportReasons.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>

          {/* Additional Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {translations?.additionalDetails || 'Additional Details'} ({translations?.optional || 'optional'})
            </label>
            <textarea
              rows={4}
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              placeholder={translations?.reportDetailsPlaceholder || 'Please provide any additional information that might help us understand the issue...'}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all duration-200 resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {translations?.charactersLimit?.replace('{current}', formData.details.length.toString()).replace('{max}', '500') || 
               `${formData.details.length}/500 characters`}
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-4">
            <button
              type="submit"
              disabled={loading || !formData.reason}
              className="flex-1 bg-red-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 rtl:space-x-reverse"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{translations?.submitting || 'Submitting...'}</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  <span>{translations?.submitReport || 'Submit Report'}</span>
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

export default ReportModal;