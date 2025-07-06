import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Company } from '../../types/company';
import { Property } from '../../types/property';
import { Building2, Edit, Trash2, Eye, Plus, MapPin, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCompanySlug } from '../../utils/urlUtils';

interface ProjectsTabProps {
  company: Company;
}

const ProjectsTab: React.FC<ProjectsTabProps> = ({ company }) => {
  const { translations } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load properties data
  useEffect(() => {
    const loadProperties = async () => {
      try {
        setLoading(true);
        
        const propertiesQuery = query(
          collection(db, 'properties'),
          where('companyId', '==', company.id),
          orderBy('createdAt', 'desc')
        );
        
        const propertiesSnapshot = await getDocs(propertiesQuery);
        const propertiesData = propertiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        })) as Property[];
        
        setProperties(propertiesData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading properties:', error);
        setError(translations?.failedToLoadProperties || 'Failed to load properties');
        setLoading(false);
      }
    };
    
    loadProperties();
  }, [company.id, translations?.failedToLoadProperties]);

  // Group properties by project
  const getProjectGroups = () => {
    const groups: { [key: string]: Property[] } = {};
    
    properties.forEach(property => {
      const projectName = property.projectName;
      
      if (!groups[projectName]) {
        groups[projectName] = [];
      }
      
      groups[projectName].push(property);
    });
    
    return groups;
  };

  const projectGroups = getProjectGroups();

  // Handle add property
  const handleAddProperty = () => {
    // Navigate to public profile to add property
    const companySlug = getCompanySlug(company.name);
    navigate(`/company/${companySlug}/${company.id}/properties`);
  };

  // Handle view property
  const handleViewProperty = (property: Property) => {
    // Navigate to public profile to view property
    const companySlug = getCompanySlug(company.name);
    navigate(`/company/${companySlug}/${company.id}/properties`);
  };

  // Handle edit property
  const handleEditProperty = (property: Property) => {
    // Navigate to public profile to edit property
    const companySlug = getCompanySlug(company.name);
    navigate(`/company/${companySlug}/${company.id}/properties`);
  };

  // Get property type translation
  const getPropertyTypeTranslation = (type: string) => {
    switch(type) {
      case 'apartment': return translations?.apartment || 'Apartment';
      case 'villa': return translations?.villa || 'Villa';
      case 'commercial': return translations?.commercial || 'Commercial';
      case 'land': return translations?.land || 'Land';
      case 'office': return translations?.office || 'Office';
      default: return type;
    }
  };

  // Get status badge style
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'available': 
        return { 
          text: translations?.available || 'Available',
          bg: 'bg-green-100',
          text_color: 'text-green-800'
        };
      case 'sold': 
        return { 
          text: translations?.sold || 'Sold',
          bg: 'bg-red-100',
          text_color: 'text-red-800'
        };
      case 'reserved': 
        return { 
          text: translations?.reserved || 'Reserved',
          bg: 'bg-yellow-100',
          text_color: 'text-yellow-800'
        };
      default: 
        return { 
          text: status,
          bg: 'bg-gray-100',
          text_color: 'text-gray-800'
        };
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Notification Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 rtl:space-x-reverse">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center space-x-3 rtl:space-x-reverse">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Header with Add Button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {translations?.projects || 'Projects'} ({Object.keys(projectGroups).length})
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            {translations?.manageYourProjects || 'Manage your real estate projects and properties'}
          </p>
        </div>
        
        <button
          onClick={handleAddProperty}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          {translations?.addProperty || 'Add Property'}
        </button>
      </div>
      
      {/* Projects List */}
      {Object.keys(projectGroups).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(projectGroups).map(([projectName, projectProperties]) => (
            <div key={projectName} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Project Header */}
              <div className="bg-gray-50 p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">{projectName}</h3>
                <p className="text-gray-500 text-sm mt-1">
                  {translations?.propertiesInProject?.replace('{count}', projectProperties.length.toString()) || 
                   `${projectProperties.length} properties in this project`}
                </p>
              </div>
              
              {/* Properties Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {projectProperties.map(property => (
                  <div key={property.id} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
                    {/* Property Image */}
                    <div className="aspect-video relative bg-gray-100">
                      {property.images.length > 0 ? (
                        <img 
                          src={property.images[0]} 
                          alt={property.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building2 className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      
                      {/* Status Badge */}
                      <div className="absolute top-2 left-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(property.status).bg} ${getStatusBadge(property.status).text_color}`}>
                          {getStatusBadge(property.status).text}
                        </span>
                      </div>
                    </div>
                    
                    {/* Property Details */}
                    <div className="p-4">
                      <h4 className="font-medium text-gray-900 mb-1">{property.name}</h4>
                      
                      <div className="text-sm text-gray-600 space-y-1 mb-3">
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 text-gray-500 mr-1" />
                          <span>{property.location}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                            {getPropertyTypeTranslation(property.propertyType)}
                          </span>
                          <span className="ml-2">{property.area} m²</span>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex justify-between">
                        <button
                          onClick={() => handleViewProperty(property)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          {translations?.view || 'View'}
                        </button>
                        <button
                          onClick={() => handleEditProperty(property)}
                          className="text-orange-600 hover:text-orange-800 text-sm font-medium flex items-center"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          {translations?.edit || 'Edit'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {translations?.noPropertiesYet || 'No properties added yet'}
          </h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            {translations?.addPropertiesToShowcase || 'Add properties to showcase your projects to potential customers.'}
          </p>
          <button
            onClick={handleAddProperty}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            {translations?.addFirstProperty || 'Add First Property'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectsTab;