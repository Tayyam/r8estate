import React, { useState } from 'react';
import { Trash2, AlertCircle } from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../../../config/firebase';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Company } from '../../../types/company';

interface DeleteCompanyModalProps {
  company: Company;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const DeleteCompanyModal: React.FC<DeleteCompanyModalProps> = ({
  company,
  onClose,
  onSuccess,
  onError
}) => {
  const { translations } = useLanguage();
  const [loading, setLoading] = useState(false);

  // Delete logo from Firebase Storage
  const deleteLogo = async (logoUrl: string) => {
    try {
      // Extract file path from URL
      const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/r8estate-2a516.firebasestorage.app/o/';
      if (logoUrl.startsWith(baseUrl)) {
        const filePath = decodeURIComponent(logoUrl.replace(baseUrl, '').split('?')[0]);
        const storageRef = ref(storage, filePath);
        await deleteObject(storageRef);
      }
    } catch (error) {
      console.error('Error deleting logo:', error);
      // Don't throw error for delete operations as it might be already deleted
    }
  };

  // Handle company deletion
  const handleDelete = async () => {
    try {
      setLoading(true);
      
      // Delete logo from storage if exists
      if (company.logoUrl) {
        await deleteLogo(company.logoUrl);
      }
      
      // Delete company document from Firestore
      await deleteDoc(doc(db, 'companies', company.id));
      
      // Delete user document
      await deleteDoc(doc(db, 'users', company.id));
      
      // Note: Firebase Auth user cannot be deleted from client side.
      // A Firebase Cloud Function would be needed to delete the Auth user.
      
      onSuccess(translations?.companyDeletedSuccess || 'Company deleted successfully');
      onClose();
    } catch (error) {
      console.error('Error deleting company:', error);
      onError(translations?.failedToDeleteCompany || 'Failed to delete company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {translations?.deleteCompanyTitle || 'Delete Company'}
          </h3>
          
          <p className="text-gray-600 mb-6">
            {translations?.confirmDeleteCompany?.replace('{name}', company.name) || 
             `Are you sure you want to delete "${company.name}"? This action cannot be undone and will permanently remove all company data including properties and reviews.`}
          </p>
          
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse">
            <button
              onClick={handleDelete}
              disabled={loading}
              className="w-full sm:w-1/2 flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 border border-transparent rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{translations?.deletingCompany || 'Deleting...'}</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-5 w-5" />
                  <span>{translations?.deleteCompanyButton || 'Delete Company'}</span>
                </>
              )}
            </button>
            
            <button
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-1/2 px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {translations?.cancel || 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteCompanyModal;