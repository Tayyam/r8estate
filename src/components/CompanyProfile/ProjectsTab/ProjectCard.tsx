import React from 'react';
import { Building2, MapPin, ArrowUpSquare as ArrowSquareOut, Calendar } from 'lucide-react';
import { Project } from './types';
import { useLanguage } from '../../../contexts/LanguageContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const { translations, language } = useLanguage();
  
  // Format date based on language
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return format(date, 'PP', { locale: language === 'ar' ? ar : undefined });
  };
  
  // Calculate completion percentage based on start and delivery dates
  const calculateCompletionPercentage = () => {
    if (!project.startDate || !project.deliveryDate) return 0;
    
    const today = new Date();
    const startDate = project.startDate;
    const deliveryDate = project.deliveryDate;
    
    // If project is completed
    if (today >= deliveryDate) return 100;
    
    // If project hasn't started
    if (today <= startDate) return 0;
    
    // Calculate percentage
    const totalDuration = deliveryDate.getTime() - startDate.getTime();
    const elapsedDuration = today.getTime() - startDate.getTime();
    
    return Math.min(Math.round((elapsedDuration / totalDuration) * 100), 100);
  };
  
  const completionPercentage = calculateCompletionPercentage();

  return (
    <div 
      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      {/* Project Image */}
      <div className="h-48 overflow-hidden relative">
        {project.images && project.images.length > 0 ? (
          <img
            src={project.images[0]}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <Building2 className="h-12 w-12 text-gray-400" />
          </div>
        )}
        
        {/* Unit Count Badge */}
        <div className="absolute top-2 right-2 bg-blue-600/90 text-white px-2 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm">
          {project.units?.length || 0} {translations?.units || 'Units'}
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{project.name}</h3>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
            <span className="truncate">{project.location}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
            <span>
              {project.deliveryDate ? (
                <>
                  {translations?.deliveryDate || 'Delivery'}: {formatDate(project.deliveryDate)}
                  {project.deliveryDateUpdated && (
                    <span className="ml-1 text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">
                      {translations?.updated || 'Updated'}
                    </span>
                  )}
                </>
              ) : (
                translations?.noDeliveryDate || 'No delivery date'
              )}
            </span>
          </div>
        </div>
        
        {/* Progress Bar */}
        {(project.startDate && project.deliveryDate) && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">{translations?.progress || 'Progress'}</span>
              <span className="font-medium">{completionPercentage}%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  completionPercentage < 30
                    ? 'bg-blue-500'
                    : completionPercentage < 70
                      ? 'bg-amber-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {/* View Details Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <span>{translations?.viewDetails || 'View Details'}</span>
            <ArrowSquareOut className="ml-1 h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;