import React, { useState, useRef, useEffect } from 'react';
import { X, Calendar, MapPin, Upload, Plus, FileText, Calculator, Edit, Check, Clock, Eye, Download, MessageSquare } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../config/firebase';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Project, Unit, UnitType, UnitStatus, UnitTypeLabels, UnitStatusLabels, UnitStatusColors } from './types';
import { egyptianGovernorates } from '../../../types/company';
import { CompanyProfile } from '../../../types/companyProfile';
import { format, formatDistance } from 'date-fns';
import { ar } from 'date-fns/locale';
import UnitDetailsModal from './UnitDetailsModal';
import ProjectReviewsTab from './ProjectReviewsTab';
import AddUnitModal from './AddUnitModal';
import ImageViewer from '../ImageViewer';

interface ProjectDetailsModalProps {
  project: Project;
  company: CompanyProfile;
  canEdit: boolean;
  onClose: () => void;
  onSuccess: (project: Project) => void; 
  onError: (message: string) => void;
}

const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({
  project,
  company,
  canEdit,
  onClose,
  onSuccess,
  onError
}) => {
  const { translations, language } = useLanguage();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'units' | 'reviews'>('overview');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: project.name,
    about: project.about,
    area: project.area.toString(),
    location: project.location,
    startDate: project.startDate ? format(project.startDate, 'yyyy-MM-dd') : '',
    deliveryDate: project.deliveryDate ? format(project.deliveryDate, 'yyyy-MM-dd') : ''
  });
  
  const [brochureFile, setBrochureFile] = useState<File | null>(null);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviewUrls, setNewImagePreviewUrls] = useState<string[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [showUnitDetails, setShowUnitDetails] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const brochureFileRef = useRef<HTMLInputElement>(null);
  const imageFilesRef = useRef<HTMLInputElement>(null);

  // Format date based on language
  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return format(date, 'PP', { locale: language === 'ar' ? ar : undefined });
  };

  // Format date distance
  const formatDateDistance = (date: Date) => {
    return formatDistance(date, new Date(), { 
      addSuffix: true,
      locale: language === 'ar' ? ar : undefined
    });
  };

  // Get location name by ID
  const getLocationName = (locationId: string): string => {
    const location = egyptianGovernorates.find(gov => gov.id === locationId);
    return location ? (language === 'ar' ? (location.nameAr || location.name) : location.name) : locationId;
  };

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

  // Handle new image file selection
  const handleNewImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Save updated project
  const handleSaveProject = async () => {
    // Form validation
    if (!formData.name || !formData.about || !formData.area || !formData.location) {
      onError(translations?.pleaseFillRequiredFields || 'Please fill in all required fields');
      return;
    }
    
    // Area must be a number
    if (isNaN(parseFloat(formData.area))) {
      onError(translations?.invalidArea || 'Area must be a valid number');
      return;
    }
    
    try {
      setLoading(true);
      
      const updateData: any = {
        name: formData.name,
        about: formData.about,
        area: parseFloat(formData.area),
        location: formData.location,
        startDate: formData.startDate ? new Date(formData.startDate) : null,
        updatedAt: new Date()
      };
      
      // Check if delivery date changed
      if (formData.deliveryDate) {
        const newDeliveryDate = new Date(formData.deliveryDate);
        
        // If original delivery date exists and new date is different
        if (project.deliveryDate && 
            (newDeliveryDate.getTime() !== project.deliveryDate.getTime())) {
          updateData.deliveryDate = newDeliveryDate;
          updateData.deliveryDateUpdated = new Date();
        } else if (!project.deliveryDate) {
          // If there was no original delivery date
          updateData.deliveryDate = newDeliveryDate;
        }
      } else {
        // If delivery date is removed
        updateData.deliveryDate = null;
      }
      
      // Upload brochure if provided
      if (brochureFile) {
        const brochureUrl = await uploadBrochure(brochureFile);
        updateData.brochureUrl = brochureUrl;
      }
      
      // Upload new images
      if (newImageFiles.length > 0) {
        const newImageUrls = await uploadImages(newImageFiles);
        updateData.images = [...(project.images || []), ...newImageUrls];
      }
      
      // Update project document
      await updateDoc(doc(db, 'projects', project.id), updateData);
      
      // Update local state
      const updatedProject: Project = {
        ...project,
        ...updateData,
        area: parseFloat(formData.area),
        deliveryDateUpdated: updateData.deliveryDateUpdated || project.deliveryDateUpdated,
        images: updateData.images || project.images,
      };
      
      onSuccess(updatedProject);
      setEditing(false);
    } catch (error) {
      console.error('Error updating project:', error);
      onError(translations?.failedToUpdateProject || 'Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  // Handle adding a new unit
  const handleAddUnitSuccess = (newUnit: Unit) => {
    const updatedProject = {
      ...project,
      units: [...(project.units || []), newUnit]
    };
    onSuccess(updatedProject);
    setShowAddUnit(false);
  };

  // Handle updating a unit
  const handleUpdateUnitSuccess = (updatedUnit: Unit) => {
    const updatedUnits = project.units.map(unit => 
      unit.id === updatedUnit.id ? updatedUnit : unit
    );
    
    const updatedProject = {
      ...project,
      units: updatedUnits
    };
    
    onSuccess(updatedProject);
    setShowUnitDetails(false);
    setSelectedUnit(null);
  };

  // Handle unit click
  const handleUnitClick = (unit: Unit) => {
    setSelectedUnit(unit);
    setShowUnitDetails(true);
  };

  // Handle backdrop click to close modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle view image
  const handleViewImage = (index: number) => {
    setCurrentImageIndex(index);
    setShowImageViewer(true);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      // Cleanup preview URLs
      newImagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header with tabs */}
          <div className="border-b border-gray-200">
            <div className="flex items-center justify-between px-6 py-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                {editing ? (
                  <>
                    <Edit className="h-5 w-5 mr-2 text-blue-600" />
                    {translations?.editProject || 'Edit Project'}
                  </>
                ) : (
                  <>
                    <Eye className="h-5 w-5 mr-2 text-blue-600" />
                    {translations?.projectDetails || 'Project Details'}
                  </>
                )}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="px-4 border-b border-gray-200 flex">
              <button
                onClick={() => setSelectedTab('overview')}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  selectedTab === 'overview' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {translations?.overview || 'Overview'}
              </button>
              <button
                onClick={() => setSelectedTab('units')}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  selectedTab === 'units' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {translations?.units || 'Units'} ({project.units?.length || 0})
              </button>
              <button
                onClick={() => setSelectedTab('reviews')}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  selectedTab === 'reviews' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-1 rtl:space-x-reverse">
                  <MessageSquare className="h-4 w-4" />
                  <span>{translations?.reviews || 'Reviews'}</span>
                </div>
              </button>
            </div>
          </div>

          {/* Content - Overview or Units Tab */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
            {selectedTab === 'overview' ? (
              <div className="p-6 space-y-8">
                {editing ? (
                  /* Edit Form */
                  <div className="space-y-6">
                    {/* Project Details Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Project Name */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {translations?.projectName || 'Project Name'} *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      {/* Project Area */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {translations?.projectArea || 'Project Area (m²)'} *
                        </label>
                        <input
                          type="number"
                          required
                          value={formData.area}
                          onChange={(e) => handleInputChange('area', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                        />
                      </div>

                      {/* Location */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {translations?.location || 'Location'} *
                        </label>
                        <select
                          required
                          value={formData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">{translations?.selectLocation || 'Select location'}</option>
                          {egyptianGovernorates.map((governorate) => (
                            <option key={governorate.id} value={governorate.id}>
                              {language === 'ar' ? governorate.nameAr : governorate.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Start Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {translations?.startDate || 'Start Date'}
                        </label>
                        <input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => handleInputChange('startDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      {/* Delivery Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {translations?.deliveryDate || 'Delivery Date'}
                        </label>
                        <input
                          type="date"
                          value={formData.deliveryDate}
                          onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {project.deliveryDateUpdated && (
                          <p className="text-xs text-amber-600 mt-1">
                            <Clock className="inline-block h-3 w-3 mr-1" />
                            {translations?.previouslyUpdated || 'Previously updated'}: {formatDate(project.deliveryDateUpdated)}
                          </p>
                        )}
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
                          ) : project.brochureUrl ? (
                            <div className="flex items-center justify-center">
                              <FileText className="h-8 w-8 text-blue-500 mr-2" />
                              <div className="text-left">
                                <p className="text-sm font-medium text-gray-900">{translations?.currentBrochure || 'Current brochure'}</p>
                                <a 
                                  href={project.brochureUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-xs text-blue-600 hover:underline flex items-center"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {translations?.viewBrochure || 'View brochure'}
                                  <Eye className="h-3 w-3 ml-1" />
                                </a>
                              </div>
                              <p className="text-xs text-gray-500 ml-2">{translations?.clickToChange || 'Click to change'}</p>
                            </div>
                          ) : (
                            <div>
                              <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500 mb-1">{translations?.uploadBrochure || 'Upload project brochure (PDF)'}</p>
                              <p className="text-xs text-gray-400">{translations?.pdfOnly || 'PDF only'} • {translations?.maxSize || 'Max'} 10MB</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Add More Images */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {translations?.addMoreImages || 'Add More Images'} ({translations?.optional || 'optional'})
                        </label>
                        <div 
                          className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => imageFilesRef.current?.click()}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            ref={imageFilesRef}
                            onChange={handleNewImagesSelect}
                            className="hidden"
                            multiple
                          />
                          
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 mb-1">{translations?.uploadMoreImages || 'Upload additional project images'}</p>
                          <p className="text-xs text-gray-400">{translations?.imageFormatsAccepted || 'PNG, JPG, GIF accepted'} • {translations?.maxSize || 'Max'} 5MB per file</p>
                        </div>
                        
                        {newImagePreviewUrls.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              {translations?.newImagesSelected?.replace('{count}', newImagePreviewUrls.length.toString()) || `${newImagePreviewUrls.length} new images selected`}
                            </p>
                            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                              {newImagePreviewUrls.map((url, index) => (
                                <div key={index} className="relative group">
                                  <div className="h-20 rounded-lg overflow-hidden border border-gray-200">
                                    <img
                                      src={url}
                                      alt={`New Preview ${index + 1}`}
                                      className="h-full w-full object-cover"
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
                ) : (
                  /* View Mode */
                  <div>
                    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                      {/* Project Images */}
                      <div className="lg:w-2/3 order-2 lg:order-1">
                        {project.images && project.images.length > 0 ? (
                          <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900">
                              {translations?.projectImages || 'Project Images'}
                            </h3>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {project.images.map((imageUrl, index) => (
                                <div 
                                  key={index} 
                                  className="h-48 rounded-xl overflow-hidden shadow-sm border border-gray-200 cursor-pointer transition-all duration-200 hover:shadow-lg"
                                  onClick={() => handleViewImage(index)}
                                >
                                  <img
                                    src={imageUrl}
                                    alt={`Project ${project.name} - Image ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-100 rounded-xl p-8 text-center">
                            <p className="text-gray-500">{translations?.noImagesAvailable || 'No images available'}</p>
                          </div>
                        )}
                        
                        <div className="mt-8 space-y-4">
                          <h3 className="text-lg font-bold text-gray-900">
                            {translations?.aboutProject || 'About the Project'}
                          </h3>
                          <p className="text-gray-700 whitespace-pre-line">{project.about}</p>
                        </div>
                      </div>
                      
                      {/* Project Details Sidebar */}
                      <div className="lg:w-1/3 order-1 lg:order-2">
                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                          <h2 className="text-xl font-bold text-gray-900 mb-4">{project.name}</h2>
                          
                          <div className="space-y-4">
                            <div className="flex items-center">
                              <MapPin className="h-5 w-5 text-gray-500 mr-2" />
                              <span className="text-gray-700">{getLocationName(project.location)}</span>
                            </div>
                            
                            <div className="flex items-start">
                              <Calculator className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                              <div>
                                <p className="text-gray-700">{translations?.area || 'Area'}: {project.area.toLocaleString()} m²</p>
                              </div>
                            </div>
                            
                            {project.startDate && (
                              <div className="flex items-start">
                                <Calendar className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                                <div>
                                  <p className="text-gray-700">{translations?.startDate || 'Start Date'}: {formatDate(project.startDate)}</p>
                                </div>
                              </div>
                            )}
                            
                            {project.deliveryDate && (
                              <div className="flex items-start">
                                <Calendar className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                                <div>
                                  <p className="text-gray-700">
                                    {translations?.deliveryDate || 'Delivery Date'}: {formatDate(project.deliveryDate)}
                                    {project.deliveryDateUpdated && (
                                      <span className="ml-2 text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">
                                        {translations?.updated || 'Updated'}
                                      </span>
                                    )}
                                  </p>
                                  {project.deliveryDateUpdated && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {translations?.updatedOn || 'Updated on'} {formatDate(project.deliveryDateUpdated)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Listed On / Last Updated */}
                            <div className="pt-4 mt-4 border-t border-gray-200">
                              <div className="flex items-center justify-between text-sm text-gray-500">
                                <span>{translations?.listedOn || 'Listed on'}:</span>
                                <span>{formatDate(project.createdAt)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm text-gray-500 mt-1">
                                <span>{translations?.lastUpdated || 'Last updated'}:</span>
                                <span>{formatDateDistance(project.updatedAt)}</span>
                              </div>
                            </div>
                            
                            {/* Brochure */}
                            {project.brochureUrl && (
                              <div className="pt-4 mt-4 border-t border-gray-200">
                                <a 
                                  href={project.brochureUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center space-x-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
                                >
                                  <FileText className="h-4 w-4" />
                                  <span>{translations?.downloadBrochure || 'Download Brochure'}</span>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Units Summary */}
                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mt-4">
                          <h3 className="text-md font-bold text-gray-900 mb-4 flex items-center justify-between">
                            <span>{translations?.units || 'Units'}</span>
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                              {project.units?.length || 0} {translations?.total || 'total'}
                            </span>
                          </h3>
                          
                          {project.units && project.units.length > 0 ? (
                            <div className="space-y-2">
                              {/* Unit Status Summary */}
                              <div className="grid grid-cols-3 gap-2 mb-4">
                                {Object.values(UnitStatus).map((status) => {
                                  const count = project.units.filter(unit => unit.status === status).length;
                                  const statusColor = UnitStatusColors[status];
                                  
                                  return (
                                    <div key={status} className={`px-3 py-2 rounded-lg ${statusColor} bg-opacity-20`}>
                                      <div className="text-xs font-medium">{UnitStatusLabels[status]}</div>
                                      <div className="text-lg font-bold">{count}</div>
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {/* Unit Types Summary */}
                              <div>
                                <h4 className="text-xs font-medium text-gray-500 mb-2">{translations?.unitTypes || 'Unit Types'}</h4>
                                <div className="flex flex-wrap gap-2">
                                  {Object.values(UnitType).map((type) => {
                                    const count = project.units.filter(unit => unit.type === type).length;
                                    if (count === 0) return null;
                                    
                                    return (
                                      <div key={type} className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded-full">
                                        {UnitTypeLabels[type]} ({count})
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              
                              <button
                                onClick={() => setSelectedTab('units')}
                                className="w-full mt-4 text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                              >
                                {translations?.viewAllUnits || 'View All Units'} →
                              </button>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-gray-500 mb-2">{translations?.noUnitsYet || 'No units added yet'}</p>
                              {canEdit && (
                                <button
                                  onClick={() => setShowAddUnit(true)}
                                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  {translations?.addFirstUnit || 'Add First Unit'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Units Tab */
              <div className="p-6 space-y-6">
                {/* Header with Add Unit Button */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{translations?.projectUnits || 'Project Units'}</h3>
                  
                  {canEdit && (
                    <button
                      onClick={() => setShowAddUnit(true)}
                      className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{translations?.addUnit || 'Add Unit'}</span>
                    </button>
                  )}
                </div>
                
                {/* Units List */}
                {project.units && project.units.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {project.units.map(unit => (
                      <div 
                        key={unit.id}
                        className="border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer bg-white"
                        onClick={() => handleUnitClick(unit)}
                      >
                        {/* Unit Image */}
                        <div className="h-40 overflow-hidden">
                          {unit.images && unit.images.length > 0 ? (
                            <img
                              src={unit.images[0]}
                              alt={unit.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                              <Building2 className="h-10 w-10 text-gray-400" />
                            </div>
                          )}
                          
                          {/* Status Badge */}
                          <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold ${UnitStatusColors[unit.status]}`}>
                            {UnitStatusLabels[unit.status]}
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <h4 className="font-bold text-gray-900 mb-1">{unit.name}</h4>
                          <div className="flex items-center text-sm text-gray-500 mb-2">
                            <span>{UnitTypeLabels[unit.type]}</span>
                            <span className="mx-2">•</span>
                            <span>{unit.area} m²</span>
                          </div>
                          
                          {unit.price && (
                            <div className="font-medium text-gray-900">
                              {new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', { 
                                style: 'currency', 
                                currency: 'EGP',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              }).format(unit.price)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-2">{translations?.noUnitsAdded || 'No units have been added to this project'}</p>
                    {canEdit && (
                      <button
                        onClick={() => setShowAddUnit(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {translations?.addFirstUnit || 'Add First Unit'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          ) : selectedTab === 'reviews' ? (
            /* Reviews Tab */
            <div className="p-6">
              <ProjectReviewsTab
                project={project}
                onSuccess={onError}
                onError={onError}
              />
            </div>
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
                  onClick={handleSaveProject}
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
                {canEdit && selectedTab === 'overview' && (
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

      {/* Unit Details Modal */}
      {showUnitDetails && selectedUnit && (
        <UnitDetailsModal
          unit={selectedUnit}
          project={project}
          canEdit={canEdit}
          onClose={() => {
            setShowUnitDetails(false);
            setSelectedUnit(null);
          }}
          onSuccess={handleUpdateUnitSuccess}
          onError={onError}
        />
      )}
      
      {/* Add Unit Modal */}
      {showAddUnit && (
        <AddUnitModal
          project={project}
          onClose={() => setShowAddUnit(false)}
          onSuccess={handleAddUnitSuccess}
          onError={onError}
        />
      )}
      
      {/* Image Viewer */}
      {showImageViewer && project.images && (
        <ImageViewer
          images={project.images}
          currentIndex={currentImageIndex}
          setCurrentIndex={setCurrentImageIndex}
          onClose={() => setShowImageViewer(false)}
        />
      )}
    </>
  );
};

export default ProjectDetailsModal;