import React, { useState } from 'react';
import { Flag, X, AlertCircle } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { ReportReason } from '../../types/reports';

interface ReportModalProps {
  contentType: 'review' | 'reply';
  contentId: string;
  companyId: string;
  onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({
  contentType,
  contentId,
  companyId,
  onClose
}) => {
  const { currentUser } = useAuth();
  const { translations } = useLanguage();
  const { showSuccessToast, showErrorToast } = useNotification();
  
  const [selectedReason, setSelectedReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const reportReasons: { value: ReportReason; label: string }[] = [
    { value: 'spam', label: translations?.reportReasonSpam || 'Spam' },
    { value: 'inappropriate', label: translations?.reportReasonInappropriate || 'Inappropriate Content' },
    { value: 'fake', label: translations?.reportReasonFake || 'Fake Review' },
    { value: 'offensive', label: translations?.reportReasonOffensive || 'Offensive Content' },
    { value: 'other', label: translations?.reportReasonOther || 'Other' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      showErrorToast(
        translations?.error || 'Error',
        translations?.mustBeLoggedInToReport || 'You must be logged in to report content'
      );
      return;
    }

    if (!selectedReason) {
      showErrorToast(
        translations?.error || 'Error',
        translations?.pleaseSelectReason || 'Please select a reason for reporting'
      );
      return;
    }

    try {
      setLoading(true);

      // Create report in Firestore
      await addDoc(collection(db, 'reports'), {
        reporterId: currentUser.uid,
        reporterName: currentUser.displayName || currentUser.email,
        contentType,
        contentId,
        companyId,
        reason: selectedReason,
        details: details.trim() || null,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      showSuccessToast(
        translations?.reportSubmitted || 'Report Submitted',
        translations?.reportSubmittedDesc || 'Your report has been submitted and will be reviewed by our team'
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Information Box */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-start space-x-3 rtl:space-x-reverse">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-700">
                  {translations?.reportContentInfo || 
                   'Reporting helps us identify and address inappropriate content. Our team will review your report and take appropriate action.'}
                </p>
              </div>
            </div>
          </div>

          {/* Report Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {translations?.reportReason || 'Reason for Reporting'} *
            </label>
            <div className="space-y-3">
              {reportReasons.map((reason) => (
                <label 
                  key={reason.value} 
                  className={`flex items-center space-x-3 rtl:space-x-reverse p-3 border rounded-lg cursor-pointer transition-colors duration-200 ${
                    selectedReason === reason.value 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={() => setSelectedReason(reason.value)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-gray-700">{reason.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {translations?.additionalDetails || 'Additional Details'} ({translations?.optional || 'optional'})
            </label>
            <textarea
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              placeholder={translations?.additionalDetailsPlaceholder || 'Provide any additional context or details about your report...'}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-4">
            <button
              type="submit"
              disabled={loading || !selectedReason}
              className="flex-1 bg-red-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 rtl:space-x-reverse"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{translations?.submitting || 'Submitting...'}</span>
                </>
              ) : (
                <>
                  <Flag className="h-5 w-5" />
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