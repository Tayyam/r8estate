import React from 'react';
import { AlertCircle, Trash2 } from 'lucide-react';
import { ClaimRequest } from '../../../types/company';

interface DeleteRequestModalProps {
  request: ClaimRequest;
  onClose: () => void;
  onDeleteRequest: () => Promise<void>;
  actionLoading: boolean;
  translations: any;
}

const DeleteRequestModal: React.FC<DeleteRequestModalProps> = ({
  request,
  onClose,
  onDeleteRequest,
  actionLoading,
  translations
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold mb-4">
            {translations?.deleteRequest || 'Delete Request'}
          </h3>
          <p className="text-gray-600 mb-6">
            {translations?.confirmDeleteRequest?.replace('{company}', request.companyName) || 
             `Are you sure you want to delete the claim request for ${request.companyName}? This action cannot be undone.`}
          </p>
          
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              onClick={onDeleteRequest}
              disabled={actionLoading}
              className="w-full sm:w-auto flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {actionLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              <span>{translations?.deleteRequest || 'Delete Request'}</span>
            </button>
            
            <button
              onClick={onClose}
              disabled={actionLoading}
              className="w-full sm:w-auto flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400"
            >
              {translations?.cancel || 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteRequestModal;