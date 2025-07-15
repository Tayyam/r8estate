import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { CompanyProfile as CompanyProfileType } from '../../types/companyProfile';
import { Plus, Building2, Calendar, MapPin, AlertCircle, FileText, ChevronDown, Eye } from 'lucide-react';
import ProjectCard from './ProjectsTab/ProjectCard';
import AddProjectModal from './ProjectsTab/AddProjectModal';
import ProjectDetailsModal from './ProjectsTab/ProjectDetailsModal';
import { Project } from './ProjectsTab/types';

interface ProjectsTabProps {
  company: CompanyProfileType;
  canEdit: boolean;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const ProjectsTab: React.FC<ProjectsTabProps> = ({
  company,
  canEdit,
  onSuccess,
  onError
}) => {
  const { translations, language } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Load company projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        
        const projectsQuery = query(
          collection(db, 'projects'),
          where('companyId', '==', company.id),
          orderBy('createdAt', 'desc'),
        );
        
        const snapshot = await getDocs(projectsQuery);
        const projectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          startDate: doc.data().startDate?.toDate() || null,
          deliveryDate: doc.data().deliveryDate?.toDate() || null,
          deliveryDateUpdated: doc.data().deliveryDateUpdated?.toDate() || null,
        })) as Project[];
        
        setProjects(projectsData);
        setHasMore(false); // For now, we load all projects at once
        
      } catch (error) {
        console.error('Error loading projects:', error);
        onError(translations?.failedToLoadProjects || 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    };
    
    loadProjects();
  }, [company.id]);

  // Handle add project success
  const handleAddProjectSuccess = (newProject: Project) => {
    setProjects(prev => [newProject, ...prev]);
    setShowAddProject(false);
    onSuccess(translations?.projectAddedSuccess || 'Project added successfully');
  };

  // Handle project click to view details
  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setShowProjectDetails(true);
  };

  // Handle project update success
  const handleUpdateProjectSuccess = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    setShowProjectDetails(false);
    setSelectedProject(null);
    onSuccess(translations?.projectUpdatedSuccess || 'Project updated successfully');
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {translations?.propertiesTitle || 'Projects'}
          </h2>
          <p className="text-gray-600">
            {translations?.propertiesAvailable?.replace('{count}', projects.length.toString()) || 
             `${projects.length} ${projects.length === 1 ? 'project' : 'projects'} available`}
          </p>
        </div>
        
        {canEdit && (
          <button
            onClick={() => setShowAddProject(true)}
            className="mt-4 md:mt-0 inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4" />
            <span>{translations?.addProperty || 'Add Project'}</span>
          </button>
        )}
      </div>
      
      {/* Projects List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((_, index) => (
            <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden h-80">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            {translations?.noPropertiesYet || 'No projects listed yet'}
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {translations?.showcaseProperties || 'Start showcasing your projects to potential clients by adding your first project.'}
          </p>
          {canEdit && (
            <button
              onClick={() => setShowAddProject(true)}
              className="inline-flex items-center space-x-2 rtl:space-x-reverse px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Plus className="h-5 w-5" />
              <span>{translations?.addFirstProperty || 'Add First Project'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <ProjectCard 
              key={project.id}
              project={project}
              onClick={() => handleProjectClick(project)}
            />
          ))}
          
          {/* Load More Button */}
          {hasMore && (
            <div className="col-span-full flex justify-center mt-6">
              <button
                onClick={() => {/* Load more function would go here */}}
                disabled={loadingMore}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loadingMore ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {translations?.loading || 'Loading...'}
                  </>
                ) : (
                  <>
                    <ChevronDown className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    {translations?.loadMore || 'Load More'}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Add Project Modal */}
      {showAddProject && (
        <AddProjectModal
          company={company}
          onClose={() => setShowAddProject(false)}
          onSuccess={handleAddProjectSuccess}
          onError={onError}
        />
      )}
      
      {/* Project Details Modal */}
      {showProjectDetails && selectedProject && (
        <ProjectDetailsModal
          project={selectedProject}
          company={company}
          canEdit={canEdit}
          onClose={() => {
            setShowProjectDetails(false);
            setSelectedProject(null);
          }}
          onSuccess={handleUpdateProjectSuccess}
          onError={onError}
        />
      )}
    </div>
  );
};

export default ProjectsTab;