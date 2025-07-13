import React, { useState, useEffect } from 'react';
import { CheckCircle, X, SearchCode } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import TrackingModal from './TrackingModal';

interface CheckStatusProps {
  onClose: () => void;
  translations: any;
}

const CheckStatus: React.FC<CheckStatusProps> = ({ onClose, translations }) => {
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [hasStoredTracking, setHasStoredTracking] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');

  useEffect(() => {
    // Check if there's a tracking number in localStorage
    const storedTracking = localStorage.getItem('claimTrackingNumber');
    if (storedTracking) {
      setTrackingNumber(storedTracking);
      setHasStoredTracking(true);
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {translations?.trackClaimRequest || 'Track Your Claim Request'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {hasStoredTracking ? (
            <div className="mb-6">
              <p className="mb-4 text-gray-700">
                {translations?.foundTrackingNumber || 'We found a saved tracking number for your claim request:'}
              </p>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-lg font-bold text-blue-800">{trackingNumber}</p>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                {translations?.enterTrackingToCheck || "If you have a tracking number from a previous claim request, you can check its status."}
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 rtl:space-x-reverse">
            <button
              type="button"
              onClick={() => setShowTrackingModal(true)}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 transition-all duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse"
            >
              <SearchCode className="h-5 w-5" />
              <span>{translations?.checkStatus || 'Check Status'}</span>
            </button>
            
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-400 transition-all duration-200"
            >
              {translations?.close || 'Close'}
            </button>
          </div>
        </div>
      </div>

      {showTrackingModal && (
        <TrackingModal 
          onClose={() => setShowTrackingModal(false)}
          translations={translations}
        />
      )}
    </div>
  );
};

export default CheckStatus;