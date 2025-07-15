import React, { useState, useEffect } from 'react';
import { Users, Plus, User, Mail, Key, Shield, Calendar, AlertCircle, CheckCircle, Search } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { collection, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../config/firebase';
import { User as UserType } from '../../../types/user';
import UserTable from './UserTable';

const UserManagement = () => {
  const { currentUser } = useAuth();
  const { translations, language, direction } = useLanguage();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [newUserData, setNewUserData] = useState({
    displayName: '',
    email: '',
    password: ''
  });
  const [newPassword, setNewPassword] = useState('');
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [suspendLoading, setSuspendLoading] = useState<string | null>(null);

  // Initialize the cloud functions
  const createUserFunction = httpsCallable(functions, 'createUser');
  const deleteUserFunction = httpsCallable(functions, 'deleteUser');
  const changePasswordFunction = httpsCallable(functions, 'changeUserPassword');

  // Load users from Firestore
  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        status: doc.data().status || 'active', // Default to active if not set
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as UserType[];
      
      // Fetch company names for company users
      const enhancedUsersData = await Promise.all(usersData.map(async (user) => {
        if (user.role === 'company' && user.companyId) {
          try {
            const companyDoc = await getDoc(doc(db, 'companies', user.companyId));
            if (companyDoc.exists()) {
              return {
                ...user,
                companyName: companyDoc.data().name || 'Unknown Company'
              };
            }
          } catch (error) {
            console.error('Error fetching company data:', error);
          }
        }
        return user;
      }));
      
      setUsers(enhancedUsersData);
    } catch (error) {
      console.error('Error loading users:', error);
      setError(translations?.failedToLoadUsers || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filter users based on search query, role, and status
  const filteredUsers = users.filter(user => {
    // Search filter
    const matchesSearch = 
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Role filter
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // Delete user using cloud function
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(selectedUser.uid);
      setError('');
      
      const result = await deleteUserFunction({
        uid: selectedUser.uid
      });

      const data = result.data as any;
      
      if (data.success) {
        setUsers(users.filter(user => user.uid !== selectedUser.uid));
        setSuccess(translations?.userDeletedSuccess || 'User deleted successfully');
        setShowDeleteModal(false);
        setSelectedUser(null);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(data.error || 'Failed to delete user');
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setError(error.message || (translations?.failedToDeleteUser || 'Failed to delete user'));
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  // Change password using cloud function
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    if (newPassword.length < 6) {
      setError(translations?.passwordMinLength || 'Password must be at least 6 characters');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setActionLoading(selectedUser.uid);
      setError('');
      
      const result = await changePasswordFunction({
        uid: selectedUser.uid,
        newPassword: newPassword
      });

      const data = result.data as any;
      
      if (data.success) {
        setSuccess(translations?.passwordChangedSuccess || 'Password changed successfully');
        setShowChangePasswordModal(false);
        setSelectedUser(null);
        setNewPassword('');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(data.error || 'Failed to change password');
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      setError(error.message || (translations?.failedToChangePassword || 'Failed to change password'));
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  // Add new admin using cloud function
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.displayName || !newUserData.email || !newUserData.password) {
      setError(translations?.fillAllFields || 'Please fill in all fields');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setActionLoading('add');
      setError('');
      
      const result = await createUserFunction({
        email: newUserData.email,
        password: newUserData.password,
        displayName: newUserData.displayName,
        role: 'admin'
      });

      const data = result.data as any;
      
      if (data.success) {
        setSuccess(translations?.adminCreatedSuccess || 'Admin user created successfully');
        setNewUserData({ displayName: '', email: '', password: '' });
        setShowAddAdmin(false);
        loadUsers(); // Reload users list
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(data.error || 'Failed to create admin user');
      }
    } catch (error: any) {
      console.error('Error creating admin:', error);
      setError(error.message || (translations?.failedToCreateAdmin || 'Failed to create admin user'));
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  // Suspend or reactivate a user
  const handleToggleUserStatus = async (user: UserType) => {
    try {
      setSuspendLoading(user.uid);
      setActionLoading('suspend');
      
      // Toggle the user's status
      const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
      
      // Update the user document in Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      
      // Update local state
      setUsers(users.map(u => 
        u.uid === user.uid 
          ? { ...u, status: newStatus } 
          : u
      ));
      
      // Show success message
      setSuccess(
        newStatus === 'active'
          ? (translations?.userActivatedSuccess || 'User activated successfully')
          : (translations?.userSuspendedSuccess || 'User suspended successfully')
      );
      
      // Close modal if open
      setShowSuspendModal(false);
      setSelectedUser(null);
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error: any) {
      console.error('Error updating user status:', error);
      setError(error.message || translations?.failedToUpdateUserStatus || 'Failed to update user status');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSuspendLoading(null);
      setActionLoading(null);
    }
  };

  // Open delete modal
  const openDeleteModal = (user: UserType) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  // Open change password modal
  const openChangePasswordModal = (user: UserType) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowChangePasswordModal(true);
  };

  // Open suspend/reactivate modal
  const openSuspendModal = (user: UserType) => {
    setSelectedUser(user);
    setShowSuspendModal(true);
  };

  // Close all modals
  const closeModals = () => {
    setShowDeleteModal(false);
    setShowChangePasswordModal(false);
    setShowAddAdmin(false);
    setShowSuspendModal(false);
    setSelectedUser(null);
    setNewPassword('');
    setNewUserData({ displayName: '', email: '', password: '' });
    setError('');
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Section Header */}
      <div className="px-4 sm:px-8 py-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <Users className="h-6 w-6" style={{ color: '#194866' }} />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold" style={{ color: '#194866' }}>
                {translations?.userManagement || 'User Management'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {loading ? (
                  translations?.loadingUsers || 'Loading users...'
                ) : (
                  translations?.totalUsers?.replace('{count}', users.length.toString()) || `Total users: ${users.length}`
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setShowAddAdmin(true)}
              className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg text-sm"
              style={{ backgroundColor: '#dc2626' }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#b91c1c';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#dc2626';
              }}
            >
              <Plus className="h-4 w-4" />
              <span>{translations?.addAdmin || 'Add Admin'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="mx-4 sm:mx-8 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 rtl:space-x-reverse">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm sm:text-base">{error}</p>
        </div>
      )}

      {success && (
        <div className="mx-4 sm:mx-8 mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center space-x-3 rtl:space-x-reverse">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700 text-sm sm:text-base">{success}</p>
        </div>
      )}

      {/* Search and Filter */}
      <div className="px-4 sm:px-8 py-4 border-b border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder={translations?.searchUsers || 'Search users...'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset page when search changes
              }}
              className="w-full pl-10 rtl:pr-10 rtl:pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
              style={{ 
                focusBorderColor: '#194866',
                focusRingColor: '#194866'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#194866';
                e.target.style.boxShadow = `0 0 0 3px rgba(25, 72, 102, 0.1)`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Role Filter */}
          <div className="">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1); // Reset page when filter changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
              style={{ 
                focusBorderColor: '#194866',
                focusRingColor: '#194866'
              }}
            >
              <option value="all">{translations?.allRoles || 'All Roles'}</option>
              <option value="admin">{translations?.adminRole || 'Admin'}</option>
              <option value="user">{translations?.userRole || 'User'}</option>
              <option value="company">{translations?.company || 'Company'}</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1); // Reset page when filter changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
              style={{ 
                focusBorderColor: '#194866',
                focusRingColor: '#194866'
              }}
            >
              <option value="all">{translations?.allStatuses || 'All Statuses'}</option>
              <option value="active">{translations?.active || 'Active'}</option>
              <option value="suspended">{translations?.suspended || 'Suspended'}</option>
            </select>
          </div>

          {/* Show results count */}
          <div className="text-sm text-gray-600 lg:text-right">
            {!loading && (
              translations?.showingUsers?.replace('{current}', filteredUsers.length.toString()).replace('{total}', users.length.toString()) || 
              `Showing ${filteredUsers.length} of ${users.length} users`
            )}
          </div>
        </div>
      </div>

      {/* Users List */}
      <UserTable
        filteredUsers={currentUsers}
        currentUserId={currentUser?.uid}
        translations={translations}
        openChangePasswordModal={openChangePasswordModal}
        openDeleteModal={openDeleteModal}
        actionLoading={actionLoading}
        suspendLoading={suspendLoading}
        handleToggleUserStatus={handleToggleUserStatus}
        loading={loading}
      />

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between">
        <div className="flex w-full sm:hidden justify-between mb-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg disabled:opacity-50"
          >
            {translations?.previous || 'Previous'}
          </button>
          <div className="px-4 py-2 text-gray-600">
            {`${currentPage} / ${totalPages}`}
          </div>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg disabled:opacity-50"
          >
            {translations?.next || 'Next'}
          </button>
        </div>
        
        {/* Desktop Pagination */}
        <div className="hidden sm:flex items-center justify-center sm:justify-end space-x-2 rtl:space-x-reverse">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {translations?.previous || 'Previous'}
          </button>
          
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
                  <span key={`ellipsis-before-${page}`} className="px-2 py-1 text-gray-500">...</span>
                );
              }
              
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 border rounded-md ${
                    currentPage === page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {translations?.next || 'Next'}
          </button>
        </div>
      </div>

      {/* Add Admin Modal */}
      {showAddAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-screen overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold mb-6" style={{ color: '#194866' }}>
              {translations?.addNewAdmin || 'Add New Admin'}
            </h3>
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.fullName || 'Full Name'}
                </label>
                <input
                  type="text"
                  required
                  value={newUserData.displayName}
                  onChange={(e) => setNewUserData({ ...newUserData, displayName: e.target.value })}
                  placeholder={translations?.enterFullName || 'Enter full name'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                  style={{ 
                    focusBorderColor: '#194866',
                    focusRingColor: '#194866'
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.email || 'Email'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    placeholder={translations?.enterEmail || 'Enter email address'}
                    className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.password || 'Password'}
                </label>
                <div className="relative">
                  <Key className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    placeholder={translations?.enterPassword || 'Enter password (min 6 characters)'}
                    className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                    minLength={6}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-4">
                <button
                  type="submit"
                  disabled={actionLoading === 'add'}
                  className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
                >
                  {actionLoading === 'add' ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 rtl:ml-2 rtl:mr-0"></div>
                  ) : null}
                  {actionLoading === 'add' 
                    ? (translations?.creatingAdmin || 'Creating...') 
                    : (translations?.createAdmin || 'Create Admin')
                  }
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200"
                >
                  {translations?.cancel || 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-screen overflow-y-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-4 text-gray-900">
                {translations?.deleteUserTitle || 'Delete User'}
              </h3>
              <p className="text-gray-600 mb-6 text-sm sm:text-base">
                {translations?.confirmDeleteUser?.replace('{name}', selectedUser.displayName) || 
                 `Are you sure you want to delete ${selectedUser.displayName}? This action cannot be undone and will permanently remove all user data.`}
              </p>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse">
                <button
                  onClick={handleDeleteUser}
                  disabled={actionLoading !== null}
                  className="flex-1 bg-red-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 rtl:space-x-reverse"
                >
                  {actionLoading === selectedUser.uid ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : null}
                  <span>{actionLoading === selectedUser.uid 
                    ? (translations?.deletingUser || 'Deleting...') 
                    : (translations?.deleteUserButton || 'Delete User')
                  }</span>
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-400 transition-colors duration-200"
                >
                  {translations?.cancel || 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-screen overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold mb-6" style={{ color: '#194866' }}>
              {translations?.changePasswordFor?.replace('{name}', selectedUser.displayName) || 
               `Change Password for ${selectedUser.displayName}`}
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.newPassword || 'New Password'}
                </label>
                <div className="relative">
                  <Key className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={translations?.newPasswordPlaceholder || 'Enter new password (min 6 characters)'}
                    className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                    minLength={6}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-4">
                <button
                  type="submit"
                  disabled={actionLoading !== null}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
                >
                  {actionLoading === selectedUser.uid ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 rtl:ml-2 rtl:mr-0"></div>
                  ) : null}
                  {actionLoading === selectedUser.uid 
                    ? (translations?.changingPassword || 'Changing...') 
                    : (translations?.changePassword || 'Change Password')
                  }
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200"
                >
                  {translations?.cancel || 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend User Modal */}
      {showSuspendModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-screen overflow-y-auto">
            <div className="text-center">
              <div className={`w-16 h-16 ${selectedUser.status === 'suspended' ? 'bg-green-100' : 'bg-yellow-100'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                <AlertCircle className={`h-8 w-8 ${selectedUser.status === 'suspended' ? 'text-green-500' : 'text-yellow-500'}`} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-4 text-gray-900">
                {selectedUser.status === 'suspended' 
                  ? (translations?.reactivateUser || 'Reactivate User')
                  : (translations?.suspendUser || 'Suspend User')
                }
              </h3>
              <p className="text-gray-600 mb-6 text-sm sm:text-base">
                {selectedUser.status === 'suspended'
                  ? (translations?.confirmReactivateUser?.replace('{name}', selectedUser.displayName) || `Are you sure you want to reactivate ${selectedUser.displayName}'s account?`)
                  : (translations?.confirmSuspendUser?.replace('{name}', selectedUser.displayName) || `Are you sure you want to suspend ${selectedUser.displayName}'s account? They will not be able to access the platform until reactivated.`)
                }
              </p>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse">
                <button
                  onClick={() => handleToggleUserStatus(selectedUser)}
                  disabled={actionLoading !== null}
                  className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 flex items-center justify-center text-white
                    ${selectedUser.status === 'suspended' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}
                  `}
                >
                  {actionLoading === 'suspend' ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 rtl:ml-2 rtl:mr-0"></div>
                  ) : null}
                  <span>
                    {selectedUser.status === 'suspended'
                      ? (translations?.reactivateUser || 'Reactivate User')
                      : (translations?.suspendUser || 'Suspend User')
                    }
                  </span>
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200"
                >
                  {translations?.cancel || 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;