import React, { useEffect, useState } from 'react';
import { X, ChevronDown, ChevronUp, Search, Filter, Check, ArrowDown, ArrowUp } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface Column {
  id: string;
  label: string;
  accessor: (row: any) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface TableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  columns: Column[];
  data: any[];
  keyExtractor: (item: any) => string;
  loading?: boolean;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    itemsPerPage?: number;
    totalItems?: number;
  };
  actions?: {
    label: string;
    onClick: (item: any) => void;
    icon?: React.ReactNode;
    color?: string;
    disabled?: (item: any) => boolean;
    show?: (item: any) => boolean;
  }[];
  filters?: {
    id: string;
    label: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
  }[];
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  maxHeight?: string;
  emptyState?: {
    icon?: React.ReactNode;
    title: string;
    description: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
}

const TableModal: React.FC<TableModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  columns,
  data,
  keyExtractor,
  loading = false,
  pagination,
  actions = [],
  filters = [],
  searchable = false,
  searchPlaceholder = '',
  onSearch,
  maxHeight = '70vh',
  emptyState
}) => {
  const { translations, direction } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>({});

  // Handle sorting
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    
    setSortConfig({ key, direction });
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (onSearch) {
      onSearch(value);
    }
  };

  // Handle filter toggles
  const toggleFilter = (filterId: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterId]: !prev[filterId]
    }));
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Render pagination controls
  const renderPagination = () => {
    if (!pagination) return null;
    
    const { currentPage, totalPages, onPageChange, itemsPerPage, totalItems } = pagination;
    
    return (
      <div className="flex items-center justify-between py-3 border-t border-gray-200 bg-white">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {translations?.previous || 'Previous'}
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {translations?.next || 'Next'}
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          {totalItems && itemsPerPage && (
            <div>
              <p className="text-sm text-gray-700">
                {translations?.showingItems?.replace('{start}', String((currentPage - 1) * itemsPerPage + 1))
                  .replace('{end}', String(Math.min(currentPage * itemsPerPage, totalItems)))
                  .replace('{total}', String(totalItems)) || 
                  `Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems} items`}
              </p>
            </div>
          )}
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px rtl:space-x-px" aria-label="Pagination">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md rtl:rounded-r-md rtl:rounded-l-none border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">{translations?.previous || 'Previous'}</span>
                <ChevronDown className={`h-5 w-5 transform ${direction === 'rtl' ? '' : 'rotate-90'} ${direction === 'ltr' ? '' : '-rotate-90'}`} />
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => 
                  page === 1 || 
                  page === totalPages || 
                  (page >= currentPage - 1 && page <= currentPage + 1)
                )
                .map((page, index, array) => {
                  // Add ellipsis
                  if (index > 0 && array[index - 1] !== page - 1) {
                    return (
                      <span 
                        key={`ellipsis-${page}`} 
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                      >
                        ...
                      </span>
                    );
                  }
                  
                  return (
                    <button
                      key={page}
                      onClick={() => onPageChange(page)}
                      aria-current={currentPage === page ? 'page' : undefined}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                        ${currentPage === page
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                      {page}
                    </button>
                  );
                })}
              
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md rtl:rounded-l-md rtl:rounded-r-none border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">{translations?.next || 'Next'}</span>
                <ChevronDown className={`h-5 w-5 transform ${direction === 'rtl' ? 'rotate-90' : '-rotate-90'}`} />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  // Empty state when no data
  const renderEmptyState = () => {
    if (!emptyState || loading || data.length > 0) return null;
    
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center">
        {emptyState.icon && <div className="mb-4">{emptyState.icon}</div>}
        <h3 className="text-lg font-medium text-gray-900 mb-2">{emptyState.title}</h3>
        <p className="text-sm text-gray-500 max-w-sm mb-4">{emptyState.description}</p>
        {emptyState.action && (
          <button
            onClick={emptyState.action.onClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
          >
            {emptyState.action.label}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Panel */}
      <div 
        className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl m-4 flex flex-col max-h-[90vh] overflow-hidden transform transition-all"
        style={{ 
          direction: direction,
          animation: "modal-appear 0.3s ease-out" 
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="text-lg font-medium text-gray-900">
              <h3 className="font-bold text-xl">{title}</h3>
              {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 p-2 rounded-full hover:bg-gray-100 transition-colors duration-150"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Search and Filters */}
        {(searchable || filters.length > 0) && (
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Search Bar */}
              {searchable && (
                <div className={`relative flex-1 min-w-[200px] ${direction === 'rtl' ? 'ml-2' : 'mr-2'}`}>
                  <Search className={`absolute ${direction === 'rtl' ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder={searchPlaceholder || (translations?.search || 'Search...')}
                    className={`w-full ${direction === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200`}
                  />
                </div>
              )}
              
              {/* Filters */}
              {filters.map(filter => (
                <div key={filter.id} className="relative">
                  <button
                    onClick={() => toggleFilter(filter.id)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-all duration-150"
                  >
                    <Filter className={`h-4 w-4 ${direction === 'rtl' ? 'ml-2' : 'mr-2'}`} />
                    <span>{filter.label}</span>
                    <ChevronDown className={`h-4 w-4 ${direction === 'rtl' ? 'mr-2' : 'ml-2'} ${activeFilters[filter.id] ? 'transform rotate-180' : ''}`} />
                  </button>
                  
                  {activeFilters[filter.id] && (
                    <div className={`absolute z-10 ${direction === 'rtl' ? 'right-0' : 'left-0'} mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5`}>
                      <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        {filter.options.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              filter.onChange(option.value);
                              toggleFilter(filter.id);
                            }}
                            className={`w-full text-${direction === 'rtl' ? 'right' : 'left'} block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900`}
                            role="menuitem"
                          >
                            <div className="flex items-center">
                              <span className="flex-1">{option.label}</span>
                              {filter.value === option.value && <Check className="h-4 w-4 text-blue-500" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Table Container */}
        <div className="flex-1 overflow-auto" style={{ maxHeight }}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 border-t-blue-500 h-12 w-12 animate-spin"></div>
            </div>
          ) : data.length === 0 ? (
            renderEmptyState()
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      scope="col"
                      className={`px-6 py-3 text-xs font-medium tracking-wider ${
                        column.align === 'right'
                          ? 'text-right'
                          : column.align === 'center'
                          ? 'text-center'
                          : direction === 'rtl'
                          ? 'text-right'
                          : 'text-left'
                      } text-gray-500 uppercase`}
                      style={{ width: column.width || 'auto' }}
                    >
                      {column.sortable ? (
                        <button
                          className="group inline-flex items-center space-x-1 rtl:space-x-reverse"
                          onClick={() => handleSort(column.id)}
                        >
                          <span>{column.label}</span>
                          <span className={`text-gray-400 ${sortConfig?.key === column.id ? 'visible' : 'invisible group-hover:visible'}`}>
                            {sortConfig?.key === column.id ? (
                              sortConfig.direction === 'asc' ? (
                                <ArrowUp className="h-4 w-4" />
                              ) : (
                                <ArrowDown className="h-4 w-4" />
                              )
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </span>
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                  
                  {/* Actions column header */}
                  {actions.length > 0 && (
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">{translations?.actions || 'Actions'}</span>
                    </th>
                  )}
                </tr>
              </thead>
              
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row) => (
                  <tr key={keyExtractor(row)} className="hover:bg-gray-50">
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={`px-6 py-4 whitespace-nowrap ${
                          column.align === 'right'
                            ? 'text-right'
                            : column.align === 'center'
                            ? 'text-center'
                            : direction === 'rtl'
                            ? 'text-right'
                            : 'text-left'
                        }`}
                      >
                        {column.accessor(row)}
                      </td>
                    ))}
                    
                    {/* Actions column */}
                    {actions.length > 0 && (
                      <td className="px-6 py-4 whitespace-nowrap text-right rtl:text-left text-sm font-medium space-x-2 rtl:space-x-reverse">
                        {actions
                          .filter(action => !action.show || action.show(row))
                          .map((action, index) => (
                            <button
                              key={index}
                              onClick={() => action.onClick(row)}
                              disabled={action.disabled?.(row)}
                              style={{ color: action.color }}
                              className={`inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md focus:outline-none transition-colors duration-150 ${
                                action.disabled?.(row) 
                                  ? 'opacity-50 cursor-not-allowed' 
                                  : 'hover:bg-opacity-10 hover:bg-gray-500'
                              }`}
                            >
                              {action.icon && <span className={`${direction === 'rtl' ? 'ml-1.5' : 'mr-1.5'}`}>{action.icon}</span>}
                              {action.label}
                            </button>
                          ))}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination */}
        {pagination && data.length > 0 && renderPagination()}
      </div>

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes modal-appear {
          from {
            opacity: 0;
            transform: translate(0, -20px);
          }
          to {
            opacity: 1;
            transform: translate(0, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default TableModal;