import React, { useState, useRef } from 'react';
import { X, Building2, Calculator, CreditCard, Check, Upload, Eye, Calendar, Edit, MessageSquare } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../config/firebase';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Project, Unit, UnitType, UnitStatus, UnitTypeLabels, UnitStatusLabels } from './types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import ImageViewer from '../ImageViewer';
import UnitReviewsTab from './UnitReviewsTab';

interface UnitDetailsModalProps {
  unit: Unit;
  project: Project;
  canEdit: boolean;
  onClose: () => void;
  onSuccess: (unit: Unit) => void;
  onError: (message: string) => void;
}

const UnitDetailsModal: React.FC<UnitDetailsModalProps> = ({
  unit,
  project,
  canEdit,
  onClose,
  onSuccess,
  onError
}) => {
  const { translations, language } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: unit.name,
    type: unit.type,
    area: unit.area.toString(),
    price: unit.price ? unit.price.toString() : '',
    status: unit.status
  });
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviewUrls, setNewImagePreviewUrls] = useState<string[]>([]);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedTab, setSelectedTab] = useState<'details' | 'reviews'>('details');
  
  const imageFilesRef = useRef<HTMLInputElement>(null);
  
  // Format date based on language
  const formatDate = (date: Date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return '-';
    }
    return format(date, 'PP', { locale: language === 'ar' ? ar : undefined });
  };
  
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
      setNewImagePreviewUrls(prev => [...prev, previewUrl]);
    });
    
    if (invalidFiles.length > 0) {
      onError(`Some files couldn't be added: ${invalidFiles.join(', ')}`);
    }
    
    setNewImageFiles(prev => [...prev, ...validFiles]);
  };

  // Remove new image preview
  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(newImagePreviewUrls[index]);
    
    setNewImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
    setNewImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload images to Firebase Storage
  const uploadImages = async (files: File[]): Promise<string[]> => {
    try {
      const uploadPromises = files.map(async (file) => {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name.replace(/\s+/g, '_')}`;
        const filePath = `projects/${project.id}/units/${unit.id}/${fileName}`;
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

  // Save updated unit
  const handleSaveUnit = async () => {
    // Form validation
    if (!formData.name || !formData.area || !formData.type || !formData.status) {
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
      
      const updateData: any = {
        name: formData.name,
        type: formData.type as UnitType,
        area: parseFloat(formData.area),
        status: formData.status as UnitStatus,
        updatedAt: new Date()
      };
      
      // Add price if provided
      if (formData.price) {
        updateData.price = parseFloat(formData.price);
      } else {
        // Remove price field if it exists but value is empty
        updateData.price = null;
      }
      
      // Upload new images
      if (newImageFiles.length > 0) {
        const newImageUrls = await uploadImages(newImageFiles);
        updateData.images = [...(unit.images || []), ...newImageUrls];
      }
      
      // Update unit in the project document
      const updatedUnits = project.units.map(u => 
        u.id === unit.id ? { ...u, ...updateData } : u
      );
      
      await updateDoc(doc(db, 'projects', project.id), {
        units: updatedUnits,
        updatedAt: new Date()
      });
      
      // Update local state
      const updatedUnit: Unit = {
        ...unit,
        ...updateData,
        area: parseFloat(formData.area),
        price: formData.price ? parseFloat(formData.price) : undefined,
        images: updateData.images || unit.images
      };
      
      onSuccess(updatedUnit);
      setEditing(false);
    } catch (error) {
      console.error('Error updating unit:', error);
      onError(translations?.failedToUpdateUnit || 'Failed to update unit');
    } finally {
      setLoading(false);
    }
  };

  // Handle unit status class
  const getStatusClass = (status: UnitStatus) => {
    switch (status) {
      case UnitStatus.AVAILABLE:
        return 'bg-green-100 text-green-800';
      case UnitStatus.RESERVED:
        return 'bg-amber-100 text-amber-800';
      case UnitStatus.SOLD:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle view image
  const handleViewImage = (index: number) => {
    setCurrentImageIndex(index);
    setShowImageViewer(true);
  };

  // Handle backdrop click to close modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              {editing ? (
                <>Edit Unit</>
              ) : (
                <>{unit.name}</>
              )}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 overflow-x-auto">
            <div className="flex">
              <button
                onClick={() => setSelectedTab('details')}
                className={`flex items-center space-x-2 rtl:space-x-reverse px-6 py-4 text-sm font-medium ${
                  selectedTab === 'details'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Building2 className="h-5 w-5" />
                <span>{translations?.details || 'Details'}</span>
              </button>
              
              <button
                onClick={() => setSelectedTab('reviews')}
                className={`flex items-center space-x-2 rtl:space-x-reverse px-6 py-4 text-sm font-medium ${
                  selectedTab === 'reviews'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <MessageSquare className="h-5 w-5" />
                <span>{translations?.reviews || 'Reviews'}</span>
              </button>
            </div>
          </div>
          
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
            {selectedTab === 'details' && editing ? (
              /* Edit Form */
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Unit Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {translations?.unitName || 'Unit Name'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={translations?.enterUnitName || 'Enter unit name'}
                    />
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
                      <option value="">{translations?.selectUnitStatus || 'Select unit status'}</option>
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
                    <input
                      type="number"
                      required
                      value={formData.area}
                      onChange={(e) => handleInputChange('area', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={translations?.enterArea || 'Enter area in square meters'}
                      min="0"
                    />
                  </div>

                  {/* Unit Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {translations?.unitPrice || 'Unit Price (EGP)'} ({translations?.optional || 'optional'})
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={translations?.enterPrice || 'Enter price (optional)'}
                      min="0"
                    />
                  </div>

                  {/* Unit Images */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {translations?.unitImages || 'Unit Images'}
                    </label>
                    
                    {/* Current Images */}
                    {unit.images && unit.images.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">{translations?.currentImages || 'Current images'}:</p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {unit.images.map((imageUrl, index) => (
                            <div key={index} className="h-24 rounded-lg overflow-hidden border border-gray-200">
                              <img
                                src={imageUrl}
                                alt={`${unit.name} - Image ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Add New Images */}
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer transition-colors"
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
                      <p className="text-sm text-gray-500 mb-1">{translations?.addNewImages || 'Add new images'}</p>
                      <p className="text-xs text-gray-400">{translations?.imageFormatsAccepted || 'PNG, JPG, GIF accepted'} • {translations?.maxSize || 'Max'} 5MB per file</p>
                    </div>
                    
                    {/* New Image Previews */}
                    {newImagePreviewUrls.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          {translations?.newImagesSelected?.replace('{count}', newImagePreviewUrls.length.toString()) || `${newImagePreviewUrls.length} new images selected`}
                        </p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {newImagePreviewUrls.map((url, index) => (
                            <div key={index} className="relative group">
                              <div className="h-24 rounded-lg overflow-hidden border border-gray-200">
                                <img
                                  src={url}
                                  alt={`New Preview ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeNewImage(index);
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
            ) : selectedTab === 'details' && !editing ? (
              /* View Mode */
              <div className="p-6">
                {/* Unit Images */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">{translations?.unitImages || 'Unit Images'}</h3>
                  {unit.images && unit.images.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {unit.images.map((imageUrl, index) => (
                        <div 
                          key={index} 
                          className="h-48 rounded-xl overflow-hidden shadow-sm border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => handleViewImage(index)}
                        >
                          <img
                            src={imageUrl}
                            alt={`${unit.name} - Image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-100 rounded-xl p-8 text-center">
                      <p className="text-gray-500">{translations?.noImagesAvailable || 'No images available'}</p>
                    </div>
                  )}
                </div>
                
                {/* Unit Details */}
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center mb-4">
                        <Building2 className="h-5 w-5 text-gray-500 mr-2" />
                        <h3 className="font-bold text-gray-900">{translations?.unitInfo || 'Unit Information'}</h3>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">{translations?.unitType || 'Unit Type'}:</span>
                          <span className="font-medium text-gray-900">{UnitTypeLabels[unit.type]}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">{translations?.unitStatus || 'Status'}:</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClass(unit.status)}`}>
                            {UnitStatusLabels[unit.status]}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">{translations?.area || 'Area'}:</span>
                          <span className="font-medium text-gray-900">{unit.area} m²</span>
                        </div>
                        
                        {unit.price !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">{translations?.price || 'Price'}:</span>
                            <span className="font-medium text-gray-900">
                              {new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', { 
                                style: 'currency', 
                                currency: 'EGP',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              }).format(unit.price)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Reviews Tab */
              <div className="p-6">
                <UnitReviewsTab
                  project={project}
                  unit={unit}
                  onSuccess={onSuccess}
                  onError={onError}
                />
              </div>
            )}
          </div>

          {/* Footer with Actions */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 rtl:space-x-reverse">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  {translations?.cancel || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveUnit}
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2 rtl:space-x-reverse"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>
                    {loading 
                      ? (translations?.saving || 'Saving...') 
                      : (translations?.saveChanges || 'Save Changes')
                    }
                  </span>
                </button>
              </>
            ) : (
              <>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 flex items-center"
                  >
                    <Edit className="mr-1.5 h-4 w-4 text-gray-500" />
                    {translations?.edit || 'Edit'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  {translations?.close || 'Close'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Image Viewer */}
      {showImageViewer && unit.images && (
        <ImageViewer
          images={unit.images}
          currentIndex={currentImageIndex}
          setCurrentIndex={setCurrentImageIndex}
          onClose={() => setShowImageViewer(false)}
        />
      )}
    </>
  );
};

export default UnitDetailsModal;