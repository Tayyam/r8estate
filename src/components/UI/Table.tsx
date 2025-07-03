import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Search, Filter, Check, ArrowDown, ArrowUp, ArrowLeft, ArrowRight, MoreHorizontal } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface TableColumn<T> {
  id: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface TablePagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

interface TableAction<T> {
  label: string;
  onClick: (item: T) => void;
  icon?: React.ReactNode;
  color?: string;
  disabled?: (item: T) => boolean;
  show?: (item: T) => boolean;
}

interface TableEmptyState {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface TableFilter {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  pagination?: TablePagination;
  actions?: TableAction<T>[];
  filters?: TableFilter[];
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  emptyState?: TableEmptyState;
  containerClassName?: string;
  title?: string;
  subtitle?: string;
}

const Table = <T extends unknown>({
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
  emptyState,
  containerClassName = 'bg-white rounded-lg shadow-sm overflow-hidden',
  title,
  subtitle
}: TableProps<T>) => {
  const { translations, direction } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>({});
  const [showActionMenus, setShowActionMenus] = useState<Record<string, boolean>>({});

  // Handle sort
  const handleSort = (columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    if (!column?.sortable) return;
    
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === columnId) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    
    setSortConfig({ key: columnId, direction });
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (onSearch) {
      onSearch(value);
    }
  };

  // Toggle filter dropdown
  const toggleFilter = (filterId: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterId]: !prev[filterId]
    }));
  };

  // Toggle action menu for a specific row
  const toggleActionMenu = (itemKey: string) => {
    setShowActionMenus(prev => ({
      ...prev,
      [itemKey]: !prev[itemKey]
    }));
  };

  // Close all action menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (Object.keys(showActionMenus).some(key => showActionMenus[key])) {
        const isActionButton = (event.target as Element).closest('[data-action-button]');
        const isActionMenu = (event.target as Element).closest('[data-action-menu]');
        
        if (!isActionButton && !isActionMenu) {
          setShowActionMenus({});
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionMenus]);

  // Empty state when no data
  const renderEmptyState = () => {
    if (!emptyState || loading || data.length > 0) return null;
    
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center px-4">
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

  // Render pagination controls
  const renderPagination = () => {
    if (!pagination) return null;
    
    const { currentPage, totalPages, onPageChange, itemsPerPage, totalItems } = pagination;
    
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-200">
        {/* Mobile Pagination */}
        <div className="flex flex-1 justify-between sm:hidden mb-2 sm:mb-0">
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
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {translations?.next || 'Next'}
          </button>
        </div>
        
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          {/* Items count */}
          {totalItems !== undefined && itemsPerPage && (
            <div>
              <p className="text-sm text-gray-700">
                {translations?.showingItems?.replace('{start}', String((currentPage - 1) * itemsPerPage + 1))
                  .replace('{end}', String(Math.min(currentPage * itemsPerPage, totalItems)))
                  .replace('{total}', String(totalItems)) || 
                  `Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems} items`}
              </p>
            </div>
          )}
          
          {/* Page numbers */}
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px rtl:space-x-px" aria-label="Pagination">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md rtl:rounded-r-md rtl:rounded-l-none border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">{translations?.previous || 'Previous'}</span>
                {direction === 'rtl' ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
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
                {direction === 'rtl' ? <ArrowLeft className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={containerClassName}>
      {/* Table Header with Title and Search/Filters */}
      {(title || searchable || filters.length > 0) && (
        <div className="px-6 py-4 border-b border-gray-200">
          {/* Title and Subtitle */}
          {title && (
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            </div>
          )}
          
          {/* Search and Filters */}
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
                    <div className="py-1" role="menu" aria-orientation="vertical">
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
      
      {/* Table Content */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : data.length === 0 ? (
          renderEmptyState()
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
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
                        <span>{column.header}</span>
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
                      column.header
                    )}
                  </th>
                ))}
                
                {/* Actions column header */}
                {actions.length > 0 && (
                  <th scope="col" className="relative px-6 py-3 w-24">
                    <span className="sr-only">{translations?.actions || 'Actions'}</span>
                  </th>
                )}
              </tr>
            </thead>
            
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row) => {
                const rowKey = keyExtractor(row);
                return (
                  <tr key={rowKey} className="hover:bg-gray-50">
                    {columns.map((column) => (
                      <td
                        key={`${rowKey}-${column.id}`}
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
                      <td className="px-6 py-4 whitespace-nowrap text-right rtl:text-left text-sm font-medium">
                        {/* Desktop: Show all actions inline */}
                        <div className="hidden sm:flex justify-end rtl:justify-start space-x-2 rtl:space-x-reverse">
                          {actions
                            .filter(action => !action.show || action.show(row))
                            .map((action, index) => (
                              <button
                                key={index}
                                onClick={() => action.onClick(row)}
                                disabled={action.disabled?.(row)}
                                style={{ color: action.color || '#3B82F6' }}
                                className={`inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md focus:outline-none transition-colors duration-150 ${
                                  action.disabled?.(row) 
                                    ? 'opacity-50 cursor-not-allowed' 
                                    : 'hover:bg-opacity-10 hover:bg-current'
                                }`}
                              >
                                {action.icon && <span className={`${direction === 'rtl' ? 'ml-1.5' : 'mr-1.5'}`}>{action.icon}</span>}
                                {action.label}
                              </button>
                            ))}
                        </div>

                        {/* Mobile: Action dropdown */}
                        <div className="sm:hidden relative">
                          <button
                            data-action-button="true"
                            onClick={() => toggleActionMenu(rowKey)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:bg-gray-100"
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </button>
                          
                          {showActionMenus[rowKey] && (
                            <div 
                              data-action-menu="true"
                              className={`absolute z-10 ${direction === 'rtl' ? 'left-0' : 'right-0'} mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none`}
                            >
                              <div className="py-1" role="menu" aria-orientation="vertical">
                                {actions
                                  .filter(action => !action.show || action.show(row))
                                  .map((action, index) => (
                                    <button
                                      key={index}
                                      onClick={() => {
                                        action.onClick(row);
                                        toggleActionMenu(rowKey);
                                      }}
                                      disabled={action.disabled?.(row)}
                                      className={`w-full text-${direction === 'rtl' ? 'right' : 'left'} block px-4 py-2 text-sm hover:bg-gray-100 ${
                                        action.disabled?.(row) ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'
                                      }`}
                                      style={{ color: action.disabled?.(row) ? undefined : (action.color || undefined) }}
                                    >
                                      <div className="flex items-center">
                                        {action.icon && (
                                          <span className={`${direction === 'rtl' ? 'ml-3' : 'mr-3'}`}>
                                            {action.icon}
                                          </span>
                                        )}
                                        <span>{action.label}</span>
                                      </div>
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Mobile Card View for Small Screens */}
      <div className="lg:hidden sm:hidden mt-4">
        {data.length > 0 && !loading && (
          <div className="space-y-4 px-4">
            {data.map((row) => {
              const rowKey = keyExtractor(row);
              return (
                <div key={rowKey} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                  <div className="space-y-3">
                    {columns.map((column) => (
                      <div key={`${rowKey}-${column.id}`} className="flex justify-between items-start">
                        <div className="text-sm font-medium text-gray-500">{column.header}</div>
                        <div className={`text-sm text-gray-900 ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}`}>
                          {column.accessor(row)}
                        </div>
                      </div>
                    ))}
                    
                    {/* Actions */}
                    {actions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex flex-wrap gap-2 justify-end rtl:justify-start">
                          {actions
                            .filter(action => !action.show || action.show(row))
                            .map((action, index) => (
                              <button
                                key={index}
                                onClick={() => action.onClick(row)}
                                disabled={action.disabled?.(row)}
                                style={{ color: action.color || '#3B82F6' }}
                                className={`inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md ${
                                  action.disabled?.(row) 
                                    ? 'opacity-50 cursor-not-allowed' 
                                    : 'hover:bg-opacity-10 hover:bg-current'
                                }`}
                              >
                                {action.icon && <span className={`${direction === 'rtl' ? 'ml-1.5' : 'mr-1.5'}`}>{action.icon}</span>}
                                {action.label}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && data.length > 0 && renderPagination()}
    </div>
  );
};

export default Table;