import React, { useState, useRef } from 'react';
import { X, Plus, Building2, Calculator, CreditCard, Upload, AlertCircle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../config/firebase';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Project, Unit, UnitType, UnitStatus, UnitTypeLabels, UnitStatusLabels } from './types';

interface AddUnitModalProps {
  project: Project;
  onClose: () => void;
  onSuccess: (unit: Unit) => void;
  onError: (message: string) => void;
}

const AddUnitModal: React.FC<AddUnitModalProps> = ({
  project,
  onClose,
  onSuccess,
  onError
}) => {
  const { translations } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    area: '',
    price: '',
    status: UnitStatus.AVAILABLE
  });
  
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const imageFilesRef = useRef<HTMLInputElement>(null);

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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

  // Remove image
  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviewUrls[index]);
    
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload images to Firebase Storage
  const uploadImages = async (files: File[]): Promise<string[]> => {
    try {
      const uploadPromises = files.map(async (file) => {
        const timestamp = Date.now();
        const unitId = `new-unit-${timestamp}`;
        const fileName = `${timestamp}_${file.name.replace(/\s+/g, '_')}`;
        const filePath = `projects/${project.id}/units/${unitId}/${fileName}`;
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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validation
    if (!formData.name || !formData.type || !formData.area || !formData.status) {
      onError(translations?.pleaseFillRequiredFields || 'Please fill in all required fields');
      return;
    }
    
    // Area must be a number
    if (isNaN(parseFloat(formData.area))) {
      onError(translations?.invalidArea || 'Area must be a valid number');
      return;
    }
    
    // Price must be a number if provided
    if (formData.price && isNaN(parseFloat(formData.price))) {
      onError(translations?.invalidPrice || 'Price must be a valid number');
      return;
    }
    
    try {
      setLoading(true);
      
      // Upload images if provided
      let imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        imageUrls = await uploadImages(imageFiles);
      }
      
      // Create new unit object
      const newUnit: Unit = {
        id: `unit-${Date.now()}`,
        projectId: project.id,
        name: formData.name,
        type: formData.type as UnitType,
        area: parseFloat(formData.area),
        price: formData.price ? parseFloat(formData.price) : undefined,
        status: formData.status as UnitStatus,
        images: imageUrls,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add unit to project
      const updatedUnits = [...project.units, newUnit];
      await updateDoc(doc(db, 'projects', project.id), {
        units: updatedUnits,
        updatedAt: new Date()
      });
      
      onSuccess(newUnit);
    } catch (error) {
      console.error('Error adding unit:', error);
      onError(translations?.failedToAddUnit || 'Failed to add unit');
    } finally {
      setLoading(false);
    }
  };

  // Handle backdrop click to close modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <Plus className="h-5 w-5 mr-2 text-blue-600" />
            {translations?.addNewUnit || 'Add New Unit'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Unit Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {translations?.unitName || 'Unit Name'} *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={translations?.enterUnitName || 'Enter unit name (e.g., Unit A1, Villa 5)'}
                  />
                </div>
              </div>

              {/* Unit Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {translations?.unitType || 'Unit Type'} *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{translations?.selectUnitType || 'Select unit type'}</option>
                  {Object.entries(UnitTypeLabels).map(([type, label]) => (
                    <option key={type} value={type}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Unit Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {translations?.unitStatus || 'Unit Status'} *
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(UnitStatusLabels).map(([status, label]) => (
                    <option key={status} value={status}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Unit Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {translations?.unitArea || 'Unit Area (m²)'} *
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

              {/* Unit Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {translations?.unitPrice || 'Unit Price (EGP)'} ({translations?.optional || 'optional'})
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={translations?.enterPrice || 'Enter price (optional)'}
                    min="0"
                  />
                </div>
              </div>

              {/* Unit Images */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {translations?.unitPictures || 'Unit Pictures'} ({translations?.optional || 'optional'})
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
                  <p className="text-sm text-gray-500 mb-1">{translations?.uploadUnitPictures || 'Upload unit pictures'}</p>
                  <p className="text-xs text-gray-400">{translations?.imageFormatsAccepted || 'PNG, JPG, GIF accepted'} • {translations?.maxSize || 'Max'} 5MB per file</p>
                </div>
                
                {/* Image Previews */}
                {imagePreviewUrls.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {translations?.imagesSelected?.replace('{count}', imagePreviewUrls.length.toString()) || `${imagePreviewUrls.length} images selected`}
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {imagePreviewUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <div className="h-24 rounded-lg overflow-hidden border border-gray-200">
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
            
            {/* Project Info - Non-editable */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center mb-2">
                <AlertCircle className="h-5 w-5 text-blue-500 mr-2" />
                <h4 className="text-sm font-medium text-gray-900">{translations?.projectInformation || 'Project Information'}</h4>
              </div>
              <p className="text-sm text-gray-600">{translations?.projectName || 'Project Name'}: <span className="font-medium">{project.name}</span></p>
            </div>
          </div>

          {/* Footer with Actions */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 rtl:space-x-reverse">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              {translations?.cancel || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2 rtl:space-x-reverse"
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>
                {loading 
                  ? (translations?.adding || 'Adding...') 
                  : (translations?.addUnit || 'Add Unit')
                }
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUnitModal;