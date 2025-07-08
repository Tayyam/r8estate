import React, { useState } from 'react';
import { UserMinus, AlertCircle, AlertTriangle } from 'lucide-react';
import { doc, updateDoc, getDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Company } from '../../../types/company';

interface UnclaimCompanyModalProps {
  company: Company;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const UnclaimCompanyModal: React.FC<UnclaimCompanyModalProps> = ({
  company,
  onClose,
  onSuccess,
  onError
}) => {
  const { translations } = useLanguage();
  const [loading, setLoading] = useState(false);

  // Handle unclaim submission
  const handleUnclaim = async () => {
    try {
      setLoading(true);
      
      // Find user documents associated with this company
      console.log("Finding users associated with company ID:", company.id);
      const usersQuery = query(
        collection(db, 'users'),
        where('companyId', '==', company.id),
        where('role', '==', 'company')
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      console.log("Found", usersSnapshot.size, "user(s) associated with this company");
      
      // Delete all associated user documents
      for (const userDoc of usersSnapshot.docs) {
        console.log("Deleting user document:", userDoc.id);
        await deleteDoc(doc(db, 'users', userDoc.id));
        // Note: We cannot delete Firebase Auth users from the client side
        // A Firebase Cloud Function would be needed for that
      }
      
      // Update company document to mark as unclaimed
      await updateDoc(doc(db, 'companies', company.id), {
        claimed: false,
        updatedAt: new Date(),
        // Don't remove the email as it could be useful for future reference
      });
      console.log("Updated company as unclaimed:", company.id);
      
      // Note: We cannot delete the Firebase Auth user from client side
      // A Firebase Function would be needed to delete the Auth user
      
      onSuccess(translations?.companyUnclaimedSuccess || 'Company unclaimed successfully');
      onClose();
    } catch (error) {
      console.error('Error unclaiming company:', error);
      onError(translations?.failedToUnclaimCompany || 'Failed to unclaim company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {translations?.unclaimCompany || 'Unclaim Company'}
            </h3>
            
            <p className="text-gray-600 mb-6">
              {translations?.confirmUnclaimCompany?.replace('{name}', company.name) || 
               `Are you sure you want to unclaim "${company.name}"? This will remove the user account associated with this company profile.`}
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left mb-6">
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 text-sm">
                    {translations?.importantNote || 'Important Note'}
                  </h4>
                  <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside space-y-1">
                    <li>{translations?.unclaimWarning1 || 'The user account will be deleted from the database'}</li>
                    <li>{translations?.unclaimWarning2 || 'The company will no longer have login access'}</li>
                    <li>{translations?.unclaimWarning3 || 'All company data and reviews will remain intact'}</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse">
              <button
                onClick={handleUnclaim}
                disabled={loading}
                className="w-full sm:w-1/2 flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 border border-transparent rounded-lg shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{translations?.unclaimingCompany || 'Unclaiming...'}</span>
                  </>
                ) : (
                  <>
                    <UserMinus className="h-5 w-5" />
                    <span>{translations?.unclaimCompanyButton || 'Unclaim Company'}</span>
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
    </div>
  );
};

export default UnclaimCompanyModal;