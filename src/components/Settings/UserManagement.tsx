import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, User, Shield, Mail, Calendar, AlertCircle, CheckCircle, Search, Key, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { collection, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import { User as UserType } from '../../types/user';

const UserManagement = () => {
  const { currentUser } = useAuth();
  const { translations, language, direction } = useLanguage();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
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
      
      // Filter out company users - only show admin and regular users
      // Removed filter to show all types of users
      setUsers(usersData);
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
      setActionLoading(true);
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
      setActionLoading(false);
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
      setActionLoading(true);
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
      setActionLoading(false);
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
      setActionLoading(true);
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
      setActionLoading(false);
    }
  };

  // Suspend or reactivate a user
  const handleToggleUserStatus = async () => {
    if (!selectedUser) return;
    
    try {
      setSuspendLoading(selectedUser.uid);
      setActionLoading(true);
      
      // Toggle the user's status
      const newStatus = selectedUser.status === 'suspended' ? 'active' : 'suspended';
      
      // Update the user document in Firestore
      const userRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(userRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      
      // Update local state
      setUsers(users.map(user => 
        user.uid === selectedUser.uid 
          ? { ...user, status: newStatus } 
          : user
      ));
      
      // Show success message
      setSuccess(
        newStatus === 'active'
          ? (translations?.userActivatedSuccess || 'User activated successfully')
          : (translations?.userSuspendedSuccess || 'User suspended successfully')
      );
      
      // Close modal and reset selected user
      setShowSuspendModal(false);
      setSelectedUser(null);
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error: any) {
      console.error('Error updating user status:', error);
      setError(error.message || translations?.failedToUpdateUserStatus || 'Failed to update user status');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSuspendLoading(null);
      setActionLoading(false);
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

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626' };
      default:
        return { bg: 'rgba(107, 114, 128, 0.1)', text: '#4b5563' };
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string = 'active') => {
    switch (status) {
      case 'suspended':
        return { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626' };
      default:
        return { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981' };
    }
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse">
            {/* Add Admin Button */}
            <button
              onClick={() => setShowAddAdmin(true)}
              className="flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg text-sm"
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

      {/* Search and Filters */}
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
      <div className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : currentUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">{translations?.noUsersFound || 'No users found'}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full" dir={direction}>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-8 py-4 text-start text-sm font-medium text-gray-500 uppercase tracking-wider">
                      {translations?.user || 'User'}
                    </th>
                    <th className="px-6 py-4 text-start text-sm font-medium text-gray-500 uppercase tracking-wider">
                      {translations?.role || 'Role'}
                    </th>
                    <th className="px-6 py-4 text-start text-sm font-medium text-gray-500 uppercase tracking-wider">
                      {translations?.userStatus || 'Status'}
                    </th>
                    <th className="px-6 py-4 text-start text-sm font-medium text-gray-500 uppercase tracking-wider">
                      {translations?.createdDate || 'Created'}
                    </th>
                    <th className="px-6 py-4 text-end text-sm font-medium text-gray-500 uppercase tracking-wider">
                      {translations?.actions || 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentUsers.map((user) => {
                    const roleColors = getRoleBadgeColor(user.role);
                    const statusColors = getStatusBadgeColor(user.status);
                    const RoleIcon = user.role === 'admin' ? Shield : User;
                    
                    return (
                      <tr key={user.uid} className="hover:bg-gray-50 transition-colors duration-150">
                        {/* User Info */}
                        <td className="px-8 py-6">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mr-4 rtl:ml-4 rtl:mr-0" style={{ backgroundColor: '#194866' }}>
                              {user.photoURL ? (
                                <img 
                                  src={user.photoURL} 
                                  alt={user.displayName}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <User className="w-5 h-5 text-white" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.displayName}
                              </div>
                              <div className="flex items-center text-sm text-gray-500">
                                <Mail className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-6 py-6">
                          <div className="flex items-center">
                            <div 
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize"
                              style={{ 
                                backgroundColor: roleColors.bg,
                                color: roleColors.text
                              }}
                            >
                              <RoleIcon className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                              <span>
                                {user.role === 'admin' ? (translations?.admin || 'Admin') : (translations?.userRole || 'User')}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-6">
                          <div className="flex items-center">
                            <div 
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize"
                              style={{ 
                                backgroundColor: statusColors.bg,
                                color: statusColors.text
                              }}
                            >
                              {user.status === 'suspended' ? (
                                <AlertTriangle className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                              ) : (
                                <CheckCircle className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                              )}
                              <span>
                                {user.status === 'suspended' ? (translations?.suspended || 'Suspended') : (translations?.active || 'Active')}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Created Date */}
                        <td className="px-6 py-6">
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                            {new Date(user.createdAt.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10).split('-').reverse().join('/')}

                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-6 text-right rtl:text-left">
                          {user.uid !== currentUser?.uid && (
                            <div className="flex items-center justify-end rtl:justify-start space-x-2 rtl:space-x-reverse">
                              {/* Suspend/Reactivate Button */}
                              <button
                                onClick={() => openSuspendModal(user)}
                                disabled={actionLoading || suspendLoading === user.uid}
                                className={`inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md transition-colors duration-150 disabled:opacity-50
                                  ${user.status === 'suspended'
                                    ? 'text-green-700 bg-green-100 hover:bg-green-200'
                                    : 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200'
                                  }`}
                                title={user.status === 'suspended'
                                  ? (translations?.reactivateUser || 'Reactivate User')
                                  : (translations?.suspendUser || 'Suspend User')
                                }
                              >
                                {suspendLoading === user.uid ? (
                                  <div className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <AlertTriangle className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                                )}
                                {user.status === 'suspended'
                                  ? (translations?.reactivateUser || 'Reactivate')
                                  : (translations?.suspendUser || 'Suspend')
                                }
                              </button>

                              {/* Change Password Button */}
                              <button
                                onClick={() => openChangePasswordModal(user)}
                                disabled={actionLoading}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-150 disabled:opacity-50"
                                title={translations?.changePassword || 'Change Password'}
                              >
                                <Key className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                                {translations?.passwordAction || 'Password'}
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => openDeleteModal(user)}
                                disabled={actionLoading}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 transition-colors duration-150 disabled:opacity-50"
                                title={translations?.deleteUser || 'Delete User'}
                              >
                                <Trash2 className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                                {translations?.deleteAction || 'Delete'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden">
              <div className="space-y-4 p-4">
                {currentUsers.map((user) => {
                  const roleColors = getRoleBadgeColor(user.role);
                  const statusColors = getStatusBadgeColor(user.status);
                  const RoleIcon = user.role === 'admin' ? Shield : User;
                  
                  return (
                    <div key={user.uid} className="bg-gray-50 rounded-xl p-4 space-y-3">
                      {/* User Info */}
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#194866' }}>
                          {user.photoURL ? (
                            <img 
                              src={user.photoURL} 
                              alt={user.displayName}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {user.displayName}
                          </div>
                          <div className="flex items-center text-xs text-gray-500">
                            <Mail className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                            <span className="truncate">{user.email}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Role, Status and Date */}
                      <div className="flex items-center flex-wrap gap-2">
                        <div 
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: roleColors.bg,
                            color: roleColors.text
                          }}
                        >
                          <RoleIcon className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                          {user.role === 'admin' ? (translations?.admin || 'Admin') : (translations?.userRole || 'User')}
                        </div>
                        
                        <div 
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize"
                          style={{ 
                            backgroundColor: statusColors.bg,
                            color: statusColors.text
                          }}
                        >
                          {user.status === 'suspended' ? (
                            <AlertTriangle className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                          ) : (
                            <CheckCircle className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                          )}
                          {user.status === 'suspended' ? (translations?.suspended || 'Suspended') : (translations?.active || 'Active')}
                        </div>
                        
                        <div className="flex items-center text-xs text-gray-500 ml-auto">
                          <Calendar className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                          {new Date(user.createdAt.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10).split('-').reverse().join('/')}

                        </div>
                      </div>

                      {/* Actions */}
                      {user.uid !== currentUser?.uid && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          <button
                            onClick={() => openSuspendModal(user)}
                            disabled={actionLoading || suspendLoading === user.uid}
                            className={`flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md transition-colors duration-150 disabled:opacity-50
                              ${user.status === 'suspended'
                                ? 'text-green-700 bg-green-100 hover:bg-green-200'
                                : 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200'
                              }`}
                          >
                            {suspendLoading === user.uid ? (
                              <div className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <AlertTriangle className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />
                            )}
                            {user.status === 'suspended'
                              ? (translations?.reactivateUser || 'Reactivate')
                              : (translations?.suspendUser || 'Suspend')
                            }
                          </button>
                          
                          <button
                            onClick={() => openChangePasswordModal(user)}
                            disabled={actionLoading}
                            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-150 disabled:opacity-50"
                          >
                            <Key className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />
                            {translations?.passwordAction || 'Password'}
                          </button>
                          
                          <button
                            onClick={() => openDeleteModal(user)}
                            disabled={actionLoading}
                            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 transition-colors duration-150 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />
                            {translations?.deleteAction || 'Delete'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {!loading && filteredUsers.length > 0 && (
        <div className="px-4 sm:px-8 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between">
          {/* Mobile Pagination */}
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
      )}

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
                <input
                  type="email"
                  required
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder={translations?.enterEmail || 'Enter email'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                  style={{ 
                    focusBorderColor: '#194866',
                    focusRingColor: '#194866'
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.password || 'Password'}
                </label>
                <input
                  type="password"
                  required
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  placeholder={translations?.enterPassword || 'Enter password'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                  style={{ 
                    focusBorderColor: '#194866',
                    focusRingColor: '#194866'
                  }}
                />
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-4">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    translations?.createAdmin || 'Create Admin'
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200"
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
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse">
                <button
                  onClick={handleDeleteUser}
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    translations?.deleteUserButton || 'Delete User'
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200"
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
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Key className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                {translations?.changePasswordTitle || 'Change Password'}
              </h3>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">
                {translations?.changePasswordDesc?.replace('{name}', selectedUser.displayName) || 
                 `Change password for ${selectedUser.displayName}`}
              </p>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.newPasswordLabel || 'New Password'}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={translations?.newPasswordPlaceholder || 'Enter new password (min 6 characters)'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                  style={{ 
                    focusBorderColor: '#194866',
                    focusRingColor: '#194866'
                  }}
                />
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-4">
                <button
                  type="submit"
                  disabled={actionLoading || newPassword.length < 6}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    translations?.changePasswordButton || 'Change Password'
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200"
                >
                  {translations?.cancel || 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend/Reactivate User Modal */}
      {showSuspendModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full">
            <div className="text-center">
              <div className={`w-16 h-16 ${selectedUser.status === 'suspended' ? 'bg-green-100' : 'bg-yellow-100'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                <AlertTriangle className={`h-8 w-8 ${selectedUser.status === 'suspended' ? 'text-green-500' : 'text-yellow-500'}`} />
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
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse">
                <button
                  onClick={handleToggleUserStatus}
                  disabled={actionLoading}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 flex items-center justify-center text-white
                    ${selectedUser.status === 'suspended' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}
                  `}
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 rtl:ml-2 rtl:mr-0"></div>
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
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200"
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