import React, { useState } from 'react';
import { Flag } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import ReportModal from './ReportModal';

interface ReportButtonProps {
  contentType: 'review' | 'reply';
  contentId: string;
  contentOwnerId: string;
  companyId: string;
}

const ReportButton: React.FC<ReportButtonProps> = ({
  contentType,
  contentId,
  contentOwnerId,
  companyId
}) => {
  const { currentUser } = useAuth();
  const { translations } = useLanguage();
  const [showReportModal, setShowReportModal] = useState(false);

  // Only logged-in users who are not the content owner and not admins can report
  const canReport = currentUser && 
                   currentUser.uid !== contentOwnerId && 
                   currentUser.role !== 'admin';

  if (!canReport) return null;

  return (
    <>
      <button
        onClick={() => setShowReportModal(true)}
        className="flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors duration-200"
        title={translations?.reportContent || 'Report'}
      >
        <Flag className="h-4 w-4" />
        <span>{translations?.report || 'Report'}</span>
      </button>

      {showReportModal && (
        <ReportModal
          contentType={contentType}
          contentId={contentId}
          companyId={companyId}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </>
  );
};

export default ReportButton;