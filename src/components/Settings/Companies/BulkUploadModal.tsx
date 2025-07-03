import React, { useState, useRef } from 'react';
import { Upload, Download, X, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db, functions } from '../../../config/firebase';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Category } from '../../../types/company';
import { parseCompaniesExcel, generateCompanyTemplate } from '../../../utils/excelUtils';

interface BulkUploadModalProps {
  categories: Category[];
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  categories,
  onClose,
  onSuccess,
  onError
}) => {
  const { translations } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Validate file type
      const allowedTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel.sheet.macroEnabled.12'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        onError(translations?.invalidFileType || 'Invalid file type. Please upload an Excel file (.xls or .xlsx)');
        return;
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        onError(translations?.fileTooLarge || 'File size too large. Please upload a file under 5MB');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  // Handle template download
  const handleDownloadTemplate = () => {
    try {
      generateCompanyTemplate(categories);
      onSuccess(translations?.templateDownloadedSuccess || 'Template downloaded successfully');
    } catch (error) {
      console.error('Error generating template:', error);
      onError(translations?.failedToGenerateTemplate || 'Failed to generate template');
    }
  };

  // Handle bulk upload
  const handleBulkUpload = async () => {
    if (!selectedFile) {
      onError(translations?.noFileSelected || 'No file selected');
      return;
    }
    
    try {
      setLoading(true);
      setUploadProgress(5);
      setProgressStatus(translations?.processingFile || 'Processing file...');
      
      // Parse Excel file
      const companies = await parseCompaniesExcel(selectedFile, categories);
      
      setUploadProgress(20);
      setProgressStatus(translations?.validatingData || 'Validating data...');
      
      // Process companies
      let successCount = 0;
      let errorCount = 0;
      const totalCompanies = companies.length;
      
      for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        setProgressStatus(`${translations?.processingCompany || 'Processing company'} ${i + 1}/${totalCompanies}: ${company.name}`);
        
        try {
          // Create user with email and password
          const userCredential = await createUserWithEmailAndPassword(auth, company.email, company.password);
          const userId = userCredential.user.uid;
          
          // Get category ID by name
          const categoryObj = categories.find(cat => cat.name.toLowerCase() === company.categoryName.toLowerCase());
          const categoryId = categoryObj ? categoryObj.id : categories[0].id; // Default to first category if not found
          
          // Store company data in Firestore
          await setDoc(doc(db, 'companies', userId), {
            id: userId,
            name: company.name,
            email: company.email,
            categoryId: categoryId,
            location: company.location,
            description: company.description || '',
            phone: company.phone || '',
            website: company.website || '',
            verified: false,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          // Create user document
          await setDoc(doc(db, 'users', userId), {
            uid: userId,
            email: company.email,
            displayName: company.name,
            role: 'company',
            companyId: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
            isEmailVerified: false
          });
          
          successCount++;
        } catch (error) {
          console.error(`Error creating company ${company.name}:`, error);
          errorCount++;
        }
        
        // Update progress
        setUploadProgress(20 + Math.floor((i + 1) / totalCompanies * 80));
      }
      
      setSuccessCount(successCount);
      setErrorCount(errorCount);
      setUploadProgress(100);
      setProgressStatus(translations?.uploadCompleted || 'Upload completed');
      
      const message = errorCount === 0
        ? translations?.companiesUploaded?.replace('{count}', successCount.toString()) || `${successCount} companies uploaded successfully`
        : translations?.companiesUploadedWithErrors?.replace('{success}', successCount.toString()).replace('{error}', errorCount.toString()) || 
          `${successCount} companies uploaded successfully, ${errorCount} failed`;
      
      onSuccess(message);
      
      // Reset file input after successful upload
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFile(null);
    } catch (error: any) {
      console.error('Error uploading companies:', error);
      onError(error.message || (translations?.uploadFailed || 'Failed to upload companies'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Upload className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {translations?.bulkUploadCompanies || 'Bulk Upload Companies'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-md font-semibold text-blue-800 mb-2 flex items-center space-x-2 rtl:space-x-reverse">
              <AlertCircle className="h-5 w-5" />
              <span>{translations?.uploadInstructions || 'Upload Instructions'}</span>
            </h4>
            <ul className="list-disc list-inside text-sm text-blue-700 space-y-1 mr-6 rtl:ml-6 rtl:mr-0">
              <li>{translations?.downloadTemplateFirst || 'Download the template and fill in company details'}</li>
              <li>{translations?.requiredFields || 'Name, Email, Password, Category, and Location are required'}</li>
              <li>{translations?.passwordRequirements || 'Passwords must be at least 6 characters'}</li>
              <li>{translations?.emailMustBeUnique || 'Each email address must be unique'}</li>
            </ul>
          </div>

          {/* Template Download */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-4 sm:mb-0">
                <h4 className="text-md font-semibold text-gray-900 mb-1">
                  {translations?.downloadTemplate || 'Download Template'}
                </h4>
                <p className="text-sm text-gray-600">
                  {translations?.downloadTemplateDesc || 'Use our Excel template to ensure proper formatting'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Download className="h-4 w-4" />
                <span>{translations?.downloadTemplate || 'Download Template'}</span>
              </button>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-3">
              {translations?.uploadExcelFile || 'Upload Excel File'}
            </h4>
            
            <div 
              className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center ${
                selectedFile ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              } transition-all duration-200 cursor-pointer`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xls,.xlsx"
                onChange={handleFileSelect}
                disabled={loading}
              />
              
              {selectedFile ? (
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <h5 className="text-md font-semibold text-gray-900 mb-1">
                    {translations?.fileSelected || 'File Selected'}
                  </h5>
                  <p className="text-sm text-gray-600">
                    {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="mt-3 text-sm text-red-600 hover:text-red-800"
                    disabled={loading}
                  >
                    {translations?.removeFile || 'Remove file'}
                  </button>
                </div>
              ) : (
                <>
                  <FileText className="h-12 w-12 text-gray-400 mb-3" />
                  <h5 className="text-md font-semibold text-gray-900 mb-1">
                    {translations?.dragDropFile || 'Drag & Drop your file here'}
                  </h5>
                  <p className="text-sm text-gray-500">
                    {translations?.orClickToBrowse || 'or click to browse'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {translations?.excelOnly || 'Excel files only (.xls, .xlsx)'} - {translations?.maxSizeMb || 'Max 5MB'}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {loading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{progressStatus}</span>
                <span className="text-gray-900 font-medium">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              {(successCount > 0 || errorCount > 0) && (
                <div className="text-sm">
                  <span className="text-green-600">{successCount} {translations?.successfulUploads || 'successful'}</span>
                  {errorCount > 0 && (
                    <span className="text-red-600 ml-3">{errorCount} {translations?.failedUploads || 'failed'}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3 rtl:space-x-reverse">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {translations?.close || 'Close'}
          </button>
          <button
            type="button"
            onClick={handleBulkUpload}
            disabled={loading || !selectedFile}
            className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center space-x-2 rtl:space-x-reverse"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <span>
              {loading 
                ? (translations?.uploading || 'Uploading...') 
                : (translations?.uploadCompanies || 'Upload Companies')
              }
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkUploadModal;