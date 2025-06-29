import React, { useState, useEffect, useRef } from 'react';
import { Building2, Plus, Edit, Trash2, MapPin, Ruler, AlertCircle, Eye, ChevronDown } from 'lucide-react';
import { collection, query, where, orderBy, limit, startAfter, getDocs, deleteDoc, doc, DocumentData } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { Property } from '../../types/property';
import { CompanyProfile as CompanyProfileType } from '../../types/companyProfile';
import EditPropertyModal from './EditPropertyModal';
import PropertyViewModal from './PropertyViewModal';

interface PropertiesTabProps {
  properties: Property[];
  canEdit: boolean;
  setShowAddProperty: (show: boolean) => void;
}

const PROPERTIES_PER_PAGE = 5;

// Lazy Image Component with Intersection Observer
const LazyImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}> = ({ src, alt, className, onClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const { translations } = useLanguage();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={className}>
      {isInView && !imageError && (
        <>
          {/* Loading placeholder */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
          )}
          
          {/* Actual image */}
          <img
            src={src}
            alt={alt}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setIsLoaded(true)}
            onError={() => setImageError(true)}
            onClick={onClick}
            loading="lazy"
          />
        </>
      )}
      
      {/* Error fallback */}
      {imageError && (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <span className="text-xs text-gray-400">{translations?.imageNotAvailable || 'Image not available'}</span>
          </div>
        </div>
      )}
      
      {/* Fallback placeholder when not in view */}
      {!isInView && !imageError && (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <Building2 className="h-8 w-8 text-gray-300" />
        </div>
      )}
    </div>
  );
};

const PropertiesTab: React.FC<PropertiesTabProps> = ({
  properties: initialProperties,
  canEdit,
  setShowAddProperty
}) => {
  const { currentUser } = useAuth();
  const { translations } = useLanguage();
  
  // Pagination and loading state
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentData | null>(null);
  const [totalPropertiesCount, setTotalPropertiesCount] = useState(0);
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Get company ID from the first property (assuming all properties belong to same company)
  const companyId = initialProperties.length > 0 ? initialProperties[0].companyId : null;

  // Load properties with pagination
  const loadProperties = async (loadMore = false) => {
    if (!companyId) return;

    try {
      setLoading(true);
      
      let propertiesQuery = query(
        collection(db, 'properties'),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc'),
        limit(PROPERTIES_PER_PAGE)
      );

      if (loadMore && lastDoc) {
        propertiesQuery = query(
          collection(db, 'properties'),
          where('companyId', '==', companyId),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(PROPERTIES_PER_PAGE)
        );
      }

      const propertiesSnapshot = await getDocs(propertiesQuery);
      const newProperties = propertiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Property[];

      if (loadMore) {
        setProperties(prev => [...prev, ...newProperties]);
      } else {
        setProperties(newProperties);
        // Get total count on first load
        const allPropertiesQuery = query(
          collection(db, 'properties'),
          where('companyId', '==', companyId)
        );
        const allPropertiesSnapshot = await getDocs(allPropertiesQuery);
        setTotalPropertiesCount(allPropertiesSnapshot.size);
      }

      // Set pagination state
      setHasMore(propertiesSnapshot.docs.length === PROPERTIES_PER_PAGE);
      setLastDoc(propertiesSnapshot.docs[propertiesSnapshot.docs.length - 1] || null);

    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load properties on component mount
  useEffect(() => {
    if (companyId) {
      loadProperties();
    } else {
      // Fallback to initial properties if no company ID
      setProperties(initialProperties.slice(0, PROPERTIES_PER_PAGE));
      setTotalPropertiesCount(initialProperties.length);
      setHasMore(initialProperties.length > PROPERTIES_PER_PAGE);
    }
  }, [companyId]);

  // Load more properties
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      if (companyId) {
        loadProperties(true);
      } else {
        // Fallback for initial properties
        const currentLength = properties.length;
        const nextProperties = initialProperties.slice(currentLength, currentLength + PROPERTIES_PER_PAGE);
        setProperties(prev => [...prev, ...nextProperties]);
        setHasMore(currentLength + nextProperties.length < initialProperties.length);
      }
    }
  };

  // Delete property and its images
  const handleDeleteProperty = async () => {
    if (!selectedProperty) return;

    try {
      setActionLoading(true);

      // Delete images from storage
      for (const imageUrl of selectedProperty.images) {
        try {
          const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/r8estate-2a516.firebasestorage.app/o/';
          if (imageUrl.startsWith(baseUrl)) {
            const filePath = decodeURIComponent(imageUrl.replace(baseUrl, '').split('?')[0]);
            const storageRef = ref(storage, filePath);
            await deleteObject(storageRef);
          }
        } catch (error) {
          console.error('Error deleting image:', error);
          // Continue with property deletion even if image deletion fails
        }
      }

      // Delete property document
      await deleteDoc(doc(db, 'properties', selectedProperty.id));

      // Update local state
      setProperties(prev => prev.filter(prop => prop.id !== selectedProperty.id));
      setTotalPropertiesCount(prev => prev - 1);
      
      setShowDeleteModal(false);
      setSelectedProperty(null);
      
    } catch (error) {
      console.error('Error deleting property:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle edit property success
  const handleEditSuccess = () => {
    setShowEditModal(false);
    setSelectedProperty(null);
    // Reload properties to get updated data
    if (companyId) {
      loadProperties();
    }
  };

  // Open view modal
  const openViewModal = (property: Property) => {
    setSelectedProperty(property);
    setShowViewModal(true);
  };

  // Open edit modal
  const openEditModal = (property: Property) => {
    setSelectedProperty(property);
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (property: Property) => {
    setSelectedProperty(property);
    setShowDeleteModal(true);
  };

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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {translations?.propertiesTitle || 'Properties'}
          </h2>
          <p className="text-gray-600 mt-1">
            {totalPropertiesCount > 0 
              ? (translations?.propertiesAvailable?.replace('{count}', totalPropertiesCount.toString()) || `${totalPropertiesCount} properties available`)
              : (translations?.noPropertiesYet || 'No properties listed yet')
            }
            {totalPropertiesCount > properties.length && (
              <span className="text-sm text-gray-500 ml-2">
                ({translations?.showing || 'Showing'} {properties.length} {translations?.of || 'of'} {totalPropertiesCount})
              </span>
            )}
          </p>
        </div>
        
        {canEdit && (
          <button
            onClick={() => setShowAddProperty(true)}
            className="flex items-center space-x-2 rtl:space-x-reverse px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200"
          >
            <Plus className="h-5 w-5" />
            <span>{translations?.addProperty || 'Add Property'}</span>
          </button>
        )}
      </div>

      {/* Properties Grid */}
      {properties.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <div key={property.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 group">
                {/* Property Image */}
                <div className="relative h-48 overflow-hidden">
                  {property.images.length > 0 ? (
                    <LazyImage
                      src={property.images[0]}
                      alt={property.name}
                      className="relative w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <Building2 className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-4 left-4 rtl:right-4 rtl:left-auto">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(property.status)}`}>
                      {getStatusTranslation(property.status)}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="absolute top-4 right-4 rtl:left-4 rtl:right-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex space-x-2 rtl:space-x-reverse">
                      {/* View Button - Always visible */}
                      <button
                        onClick={() => openViewModal(property)}
                        className="p-2 bg-white bg-opacity-90 hover:bg-white text-blue-600 rounded-full transition-all duration-200 shadow-md hover:shadow-lg"
                        title={translations?.viewProperty || 'View Property'}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      {/* Edit and Delete buttons - Only for editors */}
                      {canEdit && (
                        <>
                          <button
                            onClick={() => openEditModal(property)}
                            className="p-2 bg-white bg-opacity-90 hover:bg-white text-orange-600 rounded-full transition-all duration-200 shadow-md hover:shadow-lg"
                            title={translations?.editProperty || 'Edit Property'}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(property)}
                            className="p-2 bg-white bg-opacity-90 hover:bg-white text-red-600 rounded-full transition-all duration-200 shadow-md hover:shadow-lg"
                            title={translations?.deleteProperty || 'Delete Property'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Property Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{property.name}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-2">{property.description}</p>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Ruler className="h-4 w-4" />
                        <span>{translations?.area || 'Area'}:</span>
                      </div>
                      <span className="font-medium">{property.area} m²</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <MapPin className="h-4 w-4" />
                        <span>{translations?.location || 'Location'}:</span>
                      </div>
                      <span className="font-medium">{property.location}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Building2 className="h-4 w-4" />
                        <span>{translations?.project || 'Project'}:</span>
                      </div>
                      <span className="font-medium">{property.projectName}</span>
                    </div>
                    
                    {property.price && (
                      <div className="flex items-center justify-between">
                        <span>{translations?.price || 'Price'}:</span>
                        <span className="font-medium text-green-600">{formatPrice(property.price)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-xs text-gray-500 capitalize">
                      {getPropertyTypeTranslation(property.propertyType)}
                    </span>
                    
                    <div className="flex items-center space-x-3 rtl:space-x-reverse text-xs text-gray-500">
                      {property.images.length > 1 && (
                        <div className="flex items-center space-x-1 rtl:space-x-reverse">
                          <Eye className="h-3 w-3" />
                          <span>{property.images.length} {translations?.photos || 'photos'}</span>
                        </div>
                      )}
                      
                      {/* View Details Button */}
                      <button
                        onClick={() => openViewModal(property)}
                        className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                      >
                        {translations?.viewDetails || 'View Details'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center py-8">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="inline-flex items-center space-x-2 rtl:space-x-reverse px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{translations?.loading || 'Loading...'}</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-5 w-5" />
                    <span>{translations?.loadMoreProperties || 'Load More Properties'}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* End of Properties Indicator */}
          {!hasMore && properties.length > 0 && (
            <div className="text-center py-8">
              <div className="inline-flex items-center space-x-2 rtl:space-x-reverse text-gray-500">
                <div className="h-px bg-gray-300 w-8"></div>
                <span className="text-sm">{translations?.allPropertiesLoaded || 'All properties loaded'}</span>
                <div className="h-px bg-gray-300 w-8"></div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            {translations?.noPropertiesYet || 'No properties listed yet'}
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {translations?.showcaseProperties || 'Start showcasing your properties to potential clients by adding your first listing.'}
          </p>
          {canEdit && (
            <button
              onClick={() => setShowAddProperty(true)}
              className="inline-flex items-center space-x-2 rtl:space-x-reverse px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Plus className="h-5 w-5" />
              <span>{translations?.addFirstProperty || 'Add First Property'}</span>
            </button>
          )}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && properties.length === 0 && (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">{translations?.loadingProperties || 'Loading properties...'}</p>
        </div>
      )}

      {/* View Property Modal */}
      {showViewModal && selectedProperty && (
        <PropertyViewModal
          property={selectedProperty}
          onClose={() => {
            setShowViewModal(false);
            setSelectedProperty(null);
          }}
        />
      )}

      {/* Edit Property Modal */}
      {showEditModal && selectedProperty && (
        <EditPropertyModal
          property={selectedProperty}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProperty(null);
          }}
          onSuccess={handleEditSuccess}
          onError={(error) => console.error('Edit error:', error)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {translations?.deleteProperty || 'Delete Property'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {translations?.confirmDeleteProperty?.replace('{name}', selectedProperty.name) || 
                   `Are you sure you want to delete "${selectedProperty.name}"? This action cannot be undone and will permanently remove all property data and images.`}
                </p>
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse">
                  <button
                    onClick={handleDeleteProperty}
                    disabled={actionLoading}
                    className="flex-1 bg-red-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-red-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 rtl:space-x-reverse"
                  >
                    {actionLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>{translations?.deletingProperty || 'Deleting...'}</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        <span>{translations?.deletePropertyButton || 'Delete Property'}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedProperty(null);
                    }}
                    disabled={actionLoading}
                    className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-400 transition-all duration-200 disabled:opacity-50"
                  >
                    {translations?.cancel || 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertiesTab;