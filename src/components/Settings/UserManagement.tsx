import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, User, Shield, Mail, Calendar, AlertCircle, CheckCircle, Search, Key } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import { User as UserType } from '../../types/user';
import { TableModal } from '../UI';

const UserManagement = () => {
  const { currentUser } = useAuth();
  const { translations, direction } = useLanguage();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [newUserData, setNewUserData] = useState({
    displayName: '',
    email: '',
    password: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

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
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as UserType[];
      
      // Filter out company users - only show admin and regular users
      const filteredUsers = usersData.filter(user => user.role !== 'company');
      setUsers(filteredUsers);
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

  // Filter users based on search query
  const filteredUsers = users.filter(user => 
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

  // Close modals
  const closeModals = () => {
    setShowDeleteModal(false);
    setShowChangePasswordModal(false);
    setShowAddAdmin(false);
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

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4 text-red-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  // Define table columns for the TableModal
  const columns = [
    {
      id: 'user',
      label: translations?.user || 'User',
      accessor: (user: UserType) => (
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
      ),
      width: '40%'
    },
    {
      id: 'role',
      label: translations?.role || 'Role',
      accessor: (user: UserType) => {
        const roleColors = getRoleBadgeColor(user.role);
        
        return (
          <div className="flex items-center">
            <div 
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize"
              style={{ 
                backgroundColor: roleColors.bg,
                color: roleColors.text
              }}
            >
              {getRoleIcon(user.role)}
              <span className="ml-1 rtl:mr-1 rtl:ml-0">
                {user.role === 'admin' ? (translations?.admin || 'Admin') : (translations?.userRole || 'User')}
              </span>
            </div>
          </div>
        );
      },
      width: '20%'
    },
    {
      id: 'createdAt',
      label: translations?.createdDate || 'Created',
      accessor: (user: UserType) => (
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
          {user.createdAt.toLocaleDateString()}
        </div>
      ),
      sortable: true,
      width: '20%'
    }
  ];

  // Define actions for the TableModal
  const tableActions = [
    {
      label: translations?.passwordAction || 'Password',
      onClick: (user: UserType) => openChangePasswordModal(user),
      icon: <Key className="h-4 w-4" />,
      color: '#3B82F6',
      show: (user: UserType) => user.uid !== currentUser?.uid,
      disabled: (user: UserType) => actionLoading
    },
    {
      label: translations?.deleteAction || 'Delete',
      onClick: (user: UserType) => openDeleteModal(user),
      icon: <Trash2 className="h-4 w-4" />,
      color: '#EF4444',
      show: (user: UserType) => user.uid !== currentUser?.uid,
      disabled: (user: UserType) => actionLoading
    }
  ];

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

      {/* TableModal Implementation */}
      <div className="px-4 sm:px-6 py-4">
        <TableModal
          isOpen={true}
          onClose={() => {}} // This is a dummy function since we're always showing the table
          title={translations?.userManagement || 'User Management'}
          subtitle={translations?.totalUsers?.replace('{count}', filteredUsers.length.toString()) || `Total users: ${filteredUsers.length}`}
          columns={columns}
          data={paginatedUsers}
          keyExtractor={(user) => user.uid}
          loading={loading}
          actions={tableActions}
          searchable={true}
          searchPlaceholder={translations?.searchUsers || 'Search users...'}
          onSearch={setSearchQuery}
          pagination={{
            currentPage,
            totalPages,
            onPageChange: setCurrentPage,
            itemsPerPage,
            totalItems: filteredUsers.length
          }}
          filters={[
            {
              id: 'role',
              label: translations?.filterByRole || 'Filter by Role',
              options: [
                { value: 'all', label: translations?.allRoles || 'All Roles' },
                { value: 'admin', label: translations?.adminRole || 'Admin' },
                { value: 'user', label: translations?.userRole || 'User' }
              ],
              value: 'all',
              onChange: (value) => console.log(`Filter by role: ${value}`)
            }
          ]}
          emptyState={{
            icon: <Users className="h-12 w-12 text-gray-400 mx-auto" />,
            title: translations?.noUsersFound || 'No Users Found',
            description: translations?.adjustSearchCriteriaUsers || 'Try adjusting your search criteria or filters'
          }}
        />
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
    </div>
  );
};

export default UserManagement;