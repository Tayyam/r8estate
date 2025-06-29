import React, { useState } from 'react';
import { Eye, X, MapPin, Ruler, Building2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Property } from '../../types/property';

interface PropertyViewModalProps {
  property: Property;
  onClose: () => void;
}

const PropertyViewModal: React.FC<PropertyViewModalProps> = ({
  property,
  onClose
}) => {
  const { translations } = useLanguage();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Navigate to previous image
  const previousImage = () => {
    setCurrentImageIndex(current => 
      current === 0 ? property.images.length - 1 : current - 1
    );
  };

  // Navigate to next image
  const nextImage = () => {
    setCurrentImageIndex(current => 
      current === property.images.length - 1 ? 0 : current + 1
    );
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && property.images.length > 1) {
        previousImage();
      } else if (event.key === 'ArrowRight' && property.images.length > 1) {
        nextImage();
      } else if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Format price
  const formatPrice = (price: number | null) => {
    if (!price) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price).replace('EGP', 'EGP');
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'sold':
        return 'bg-red-100 text-red-800';
      case 'reserved':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status translation
  const getStatusTranslation = (status: string) => {
    switch (status) {
      case 'available':
        return translations?.available || 'Available';
      case 'sold':
        return translations?.sold || 'Sold';
      case 'reserved':
        return translations?.reserved || 'Reserved';
      default:
        return status;
    }
  };

  // Get property type translation
  const getPropertyTypeTranslation = (type: string) => {
    switch (type) {
      case 'apartment':
        return translations?.apartment || 'Apartment';
      case 'villa':
        return translations?.villa || 'Villa';
      case 'commercial':
        return translations?.commercial || 'Commercial';
      case 'land':
        return translations?.land || 'Land';
      case 'office':
        return translations?.office || 'Office';
      default:
        return type;
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Eye className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{property.name}</h3>
              <p className="text-sm text-gray-600">{translations?.propertyDetails || 'Property Details'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors duration-200"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              {property.images.length > 0 ? (
                <>
                  {/* Main Image */}
                  <div className="relative rounded-xl overflow-hidden bg-gray-100" style={{ aspectRatio: '16/10' }}>
                    <img
                      src={property.images[currentImageIndex]}
                      alt={`${property.name} - ${translations?.image || 'Image'} ${currentImageIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Navigation Arrows */}
                    {property.images.length > 1 && (
                      <>
                        <button
                          onClick={previousImage}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full flex items-center justify-center transition-all duration-200"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full flex items-center justify-center transition-all duration-200"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </>
                    )}

                    {/* Image Counter */}
                    {property.images.length > 1 && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-black bg-opacity-50 text-white rounded-full text-sm">
                        {currentImageIndex + 1} / {property.images.length}
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-4 left-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(property.status)}`}>
                        {getStatusTranslation(property.status)}
                      </span>
                    </div>
                  </div>

                  {/* Thumbnail Navigation */}
                  {property.images.length > 1 && (
                    <div className="flex space-x-2 overflow-x-auto pb-2">
                      {property.images.map((imageUrl, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                            index === currentImageIndex
                              ? 'border-blue-500 ring-2 ring-blue-200'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <img
                            src={imageUrl}
                            alt={`${translations?.thumbnail || 'Thumbnail'} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* No Images Placeholder */
                <div 
                  className="rounded-xl bg-gray-100 flex items-center justify-center"
                  style={{ aspectRatio: '16/10' }}
                >
                  <div className="text-center">
                    <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">{translations?.noImagesAvailable || 'No images available'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Property Details */}
            <div className="space-y-6">
              {/* Property Title and Type */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{property.name}</h2>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium capitalize">
                    {getPropertyTypeTranslation(property.propertyType)}
                  </span>
                </div>
              </div>

              {/* Key Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse mb-2">
                    <Ruler className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-600">{translations?.area || 'Area'}</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{property.area} m²</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse mb-2">
                    <MapPin className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-600">{translations?.location || 'Location'}</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{property.location}</p>
                  {property.locationAr && (
                    <p className="text-sm text-gray-600">{property.locationAr}</p>
                  )}
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse mb-2">
                    <Building2 className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-600">{translations?.project || 'Project'}</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{property.projectName}</p>
                  {property.projectNameAr && (
                    <p className="text-sm text-gray-600">{property.projectNameAr}</p>
                  )}
                </div>

                {property.price && (
                  <div className="bg-green-50 rounded-xl p-4">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse mb-2">
                      <span className="text-sm font-medium text-green-800">{translations?.price || 'Price'}</span>
                    </div>
                    <p className="text-xl font-bold text-green-600">{formatPrice(property.price)}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{translations?.description || 'Description'}</h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-gray-700 leading-relaxed mb-4">{property.description}</p>
                  {property.descriptionAr && (
                    <>
                      <hr className="border-gray-200 my-4" />
                      <p className="text-gray-700 leading-relaxed text-right" dir="rtl">
                        {property.descriptionAr}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Property Metadata */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{translations?.propertyInfo || 'Property Information'}</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{translations?.propertyType || 'Property Type'}:</span>
                    <span className="font-medium text-gray-900 capitalize">{getPropertyTypeTranslation(property.propertyType)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{translations?.status || 'Status'}:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(property.status)}`}>
                      {getStatusTranslation(property.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{translations?.listedOn || 'Listed on'}:</span>
                    <div className="flex items-center space-x-1 rtl:space-x-reverse">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-gray-900">
                        {property.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {property.updatedAt > property.createdAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">{translations?.lastUpdated || 'Last updated'}:</span>
                      <span className="font-medium text-gray-900">
                        {property.updatedAt.toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200"
            >
              {translations?.close || 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyViewModal;