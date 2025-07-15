import React, { useState, useRef } from 'react';
import { X, Plus, Building2, MapPin, CalendarDays, Calculator, Upload, File, FileText, FileWarning ,AlertCircle  } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../config/firebase';
import { useLanguage } from '../../../contexts/LanguageContext';
import { CompanyProfile as CompanyProfileType } from '../../../types/companyProfile';
import { egyptianGovernorates } from '../../../types/company';
import { Project, Unit } from './types';

interface AddProjectModalProps {
  company: CompanyProfileType;
  onClose: () => void;
  onSuccess: (project: Project) => void;
  onError: (message: string) => void;
}

const AddProjectModal: React.FC<AddProjectModalProps> = ({
  company,
  onClose,
  onSuccess,
  onError
}) => {
  const { translations, language } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1); // 1: Form, 2: Confirmation, 3: Final Confirmation
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    about: '',
    area: '',
    location: '',
    startDate: '',
    deliveryDate: ''
  });
  
  const [brochureFile, setBrochureFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const brochureFileRef = useRef<HTMLInputElement>(null);
  const imageFilesRef = useRef<HTMLInputElement>(null);

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle brochure file selection
  const handleBrochureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    // Check file type
    if (file.type !== 'application/pdf') {
      onError(translations?.invalidFileType || 'Invalid file type. Please upload a PDF file.');
      return;
    }
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      onError(translations?.fileTooLarge || 'File too large. Please upload a file under 10MB.');
      return;
    }
    
    setBrochureFile(file);
  };

  // Handle image file selection
  const handleImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];
    
    // Validate files
    files.forEach(file => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        invalidFiles.push(`${file.name} (Invalid format)`);
        return;
      }
      
      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        invalidFiles.push(`${file.name} (File too large)`);
        return;
      }
      
      validFiles.push(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrls(prev => [...prev, previewUrl]);
    });
    
    if (invalidFiles.length > 0) {
      onError(`Some files couldn't be added: ${invalidFiles.join(', ')}`);
    }
    
    setImageFiles(prev => [...prev, ...validFiles]);
  };

  // Remove image preview
  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviewUrls[index]);
    
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload brochure to Firebase Storage
  const uploadBrochure = async (file: File): Promise<string> => {
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name.replace(/\s+/g, '_')}`;
      const filePath = `projects/${company.id}/brochures/${fileName}`;
      const storageRef = ref(storage, filePath);
      
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (error) {
      console.error('Error uploading brochure:', error);
      throw error;
    }
  };

  // Upload images to Firebase Storage
  const uploadImages = async (files: File[]): Promise<string[]> => {
    try {
      const uploadPromises = files.map(async (file) => {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name.replace(/\s+/g, '_')}`;
        const filePath = `projects/${company.id}/images/${fileName}`;
        const storageRef = ref(storage, filePath);
        
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
      });
      
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Upload brochure if provided
      let brochureUrl;
      if (brochureFile) {
        brochureUrl = await uploadBrochure(brochureFile);
      }
      
      // Upload images
      let imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        imageUrls = await uploadImages(imageFiles);
      }
      
      // Create project document
      const projectData = {
        companyId: company.id,
        name: formData.name,
        about: formData.about,
        area: parseFloat(formData.area),
        location: formData.location,
        startDate: formData.startDate ? new Date(formData.startDate) : null,
        deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate) : null,
        brochureUrl,
        images: imageUrls,
        createdAt: new Date(),
        updatedAt: new Date(),
        units: []
      };
      
      const projectRef = await addDoc(collection(db, 'projects'), projectData);
      
      // Add project ID
      const newProject: Project = {
        id: projectRef.id,
        ...projectData,
        createdAt: new Date(),
        updatedAt: new Date(),
        startDate: projectData.startDate ? new Date(projectData.startDate) : null,
        deliveryDate: projectData.deliveryDate ? new Date(projectData.deliveryDate) : null,
        deliveryDateUpdated: null,
        units: []
      };
      
      onSuccess(newProject);
    } catch (error) {
      console.error('Error adding project:', error);
      onError(translations?.failedToAddProject || 'Failed to add project');
    } finally {
      setLoading(false);
    }
  };

  // Handle next step
  const handleNextStep = () => {
    // Form validation for first step
    if (currentStep === 1) {
      // Check required fields
      if (!formData.name || !formData.about || !formData.area || !formData.location) {
        onError(translations?.pleaseFillRequiredFields || 'Please fill in all required fields');
        return;
      }
      
      // Area must be a number
      if (isNaN(parseFloat(formData.area))) {
        onError(translations?.invalidArea || 'Area must be a valid number');
        return;
      }
      
      // If no images are provided
      if (imageFiles.length === 0) {
        onError(translations?.atLeastOneImage || 'Please upload at least one image');
        return;
      }
      
      setCurrentStep(2);
      return;
    }
    
    if (currentStep === 2) {
      setCurrentStep(3);
      return;
    }
    
    if (currentStep === 3) {
      handleSubmit();
    }
  };

  // Get location name by ID
  const getLocationName = (locationId: string): string => {
    const location = egyptianGovernorates.find(gov => gov.id === locationId);
    return location ? (language === 'ar' ? (location.nameAr || location.name) : location.name) : locationId;
  };

  // Handle backdrop click to close modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">
            {currentStep === 1 ? (translations?.addNewProperty || 'Add New Project') :
             currentStep === 2 ? (translations?.confirmAddProject || 'Confirm Project Details') :
             (translations?.finalConfirmation || 'Final Confirmation')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            disabled={loading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Warning Message */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-start">
            <FileWarning className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-yellow-700 text-sm">
              {translations?.projectDeleteWarning || 
                "Kindly note that it is not possible to delete a submitted project. Please revise carefully before submitting the project."}
            </p>
          </div>
        </div>

        {/* Content - Form */}
        {currentStep === 1 ? (
          <div className="p-6 space-y-6">
            {/* Project Details Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Project Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {translations?.projectName || 'Project Name'} *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={translations?.enterProjectName || 'Enter project name'}
                  />
                </div>
              </div>

              {/* Project Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {translations?.projectArea || 'Project Area (m²)'} *
                </label>
                <div className="relative">
                  <Calculator className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    required
                    value={formData.area}
                    onChange={(e) => handleInputChange('area', e.target.value)}
                    className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={translations?.enterArea || 'Enter area in square meters'}
                    min="0"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {translations?.location || 'Location'} *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    required
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{translations?.selectLocation || 'Select location'}</option>
                    {egyptianGovernorates.map((governorate) => (
                      <option key={governorate.id} value={governorate.id}>
                        {language === 'ar' ? governorate.nameAr : governorate.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {translations?.startDate || 'Start Date'}
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Delivery Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {translations?.deliveryDate || 'Delivery Date'}
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                    className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* About */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {translations?.aboutProject || 'About the Project'} *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.about}
                  onChange={(e) => handleInputChange('about', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={translations?.enterProjectDescription || 'Enter project description'}
                />
              </div>

              {/* Brochure Upload */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {translations?.projectBrochure || 'Project Brochure'} ({translations?.optional || 'optional'})
                </label>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => brochureFileRef.current?.click()}
                >
                  <input
                    type="file"
                    accept="application/pdf"
                    ref={brochureFileRef}
                    onChange={handleBrochureSelect}
                    className="hidden"
                  />
                  
                  {brochureFile ? (
                    <div className="flex items-center justify-center">
                      <FileText className="h-8 w-8 text-blue-500 mr-2" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900">{brochureFile.name}</p>
                        <p className="text-xs text-gray-500">{Math.round(brochureFile.size / 1024)} KB</p>
                      </div>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBrochureFile(null);
                          if (brochureFileRef.current) {
                            brochureFileRef.current.value = '';
                          }
                        }}
                        className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <File className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 mb-1">{translations?.uploadBrochure || 'Upload project brochure (PDF)'}</p>
                      <p className="text-xs text-gray-400">{translations?.pdfOnly || 'PDF only'} • {translations?.maxSize || 'Max'} 10MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Project Images */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {translations?.projectImages || 'Project Images'} *
                </label>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => imageFilesRef.current?.click()}
                >
                  <input
                    type="file"
                    accept="image/*"
                    ref={imageFilesRef}
                    onChange={handleImagesSelect}
                    className="hidden"
                    multiple
                  />
                  
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-1">{translations?.dragDropImages || 'Click to upload project images'}</p>
                  <p className="text-xs text-gray-400">{translations?.imageFormatsAccepted || 'PNG, JPG, GIF accepted'} • {translations?.maxSize || 'Max'} 5MB per file</p>
                </div>
                
                {imagePreviewUrls.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {translations?.imagesSelected || 'Selected Images'} ({imagePreviewUrls.length})
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                      {imagePreviewUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <div className="h-24 w-full rounded-lg border border-gray-200 overflow-hidden">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(index);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : currentStep === 2 ? (
          // Confirmation Screen
          <div className="p-6">
            <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800 mb-1">
                    {translations?.confirmProject || 'Please confirm your project details'}
                  </h4>
                  <p className="text-xs text-blue-700">
                    {translations?.reviewBeforeSubmitting || 'Please review all information carefully before submitting. Projects cannot be deleted after submission.'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Project Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-3">{translations?.projectDetails || 'Project Details'}</h5>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 block">{translations?.projectName || 'Project Name'}:</span>
                      <span className="font-medium text-gray-900">{formData.name}</span>
                    </div>
                    
                    <div>
                      <span className="text-gray-600 block">{translations?.area || 'Area'}:</span>
                      <span className="font-medium text-gray-900">{formData.area} m²</span>
                    </div>
                    
                    <div>
                      <span className="text-gray-600 block">{translations?.location || 'Location'}:</span>
                      <span className="font-medium text-gray-900">{getLocationName(formData.location)}</span>
                    </div>
                    
                    <div>
                      <span className="text-gray-600 block">{translations?.startDate || 'Start Date'}:</span>
                      <span className="font-medium text-gray-900">{formData.startDate || '-'}</span>
                    </div>
                    
                    <div>
                      <span className="text-gray-600 block">{translations?.deliveryDate || 'Delivery Date'}:</span>
                      <span className="font-medium text-gray-900">{formData.deliveryDate || '-'}</span>
                    </div>
                    
                    <div>
                      <span className="text-gray-600 block">{translations?.brochure || 'Brochure'}:</span>
                      <span className="font-medium text-gray-900">
                        {brochureFile ? brochureFile.name : translations?.noBrochureProvided || 'Not provided'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="col-span-2 pt-2 border-t border-gray-200 mt-2">
                    <span className="text-gray-600 block text-sm">{translations?.about || 'About'}:</span>
                    <p className="font-medium text-gray-900 text-sm mt-1">{formData.about}</p>
                  </div>
                </div>
              </div>
              
              {/* Images Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-3">{translations?.images || 'Images'} ({imagePreviewUrls.length})</h5>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {imagePreviewUrls.map((url, index) => (
                    <div key={index} className="h-20 rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Final Confirmation
          <div className="p-6 text-center">
            <div className="bg-red-50 rounded-xl p-6 mb-6 border border-red-200">
              <FileWarning className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h4 className="text-lg font-bold text-red-800 mb-2">
                {translations?.finalConfirmation || 'Final Confirmation'}
              </h4>
              <p className="text-red-700">
                {translations?.confirmationWarning || 'This is your final chance to review the project details. Once submitted, the project CANNOT be deleted.'}
              </p>
            </div>
            
            <p className="text-gray-700 mb-4">
              {translations?.confirmationQuestion || 'Are you absolutely sure you want to submit this project?'}
            </p>
          </div>
        )}

        {/* Footer - Navigation Buttons */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 rtl:space-x-reverse">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev - 1)}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              {translations?.back || 'Back'}
            </button>
          )}
          
          {currentStep === 3 ? (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                {translations?.revise || 'Revise Details'}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center space-x-2 rtl:space-x-reverse"
              >
                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>{loading ? (translations?.submitting || 'Submitting...') : (translations?.confirmAndSubmit || 'Confirm & Submit')}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleNextStep}
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2 rtl:space-x-reverse"
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{currentStep === 1 ? (translations?.next || 'Next') : (translations?.continue || 'Continue')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddProjectModal;