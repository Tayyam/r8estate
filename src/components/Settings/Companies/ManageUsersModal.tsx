import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Mail, AlertCircle, Check, Loader, Search, Building2, User, RefreshCw } from 'lucide-react';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../../config/firebase';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Company } from '../../../types/company';
import { User } from '../../../types/user';

interface ManageUsersModalProps {
  company: Company;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const ManageUsersModal: React.FC<ManageUsersModalProps> = ({
  company,
  onClose,
  onSuccess,
  onError
}) => {
  const { translations } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addMode, setAddMode] = useState<'new' | 'existing'>('new');
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    password: ''
  });
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Load users associated with this company
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        
        const usersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'company'),
          where('companyId', '==', company.id)
        );
        
        const snapshot = await getDocs(usersQuery);
        const userData = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        })) as User[];
        
        setUsers(userData);
      } catch (error) {
        console.error('Error loading users:', error);
        onError(translations?.failedToLoadUsers || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };
    
    loadUsers();
  }, [company.id]);

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.displayName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  // Handle adding a new user
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.displayName || !formData.password) {
      onError(translations?.fillAllFields || 'Please fill in all fields');
      return;
    }
    
    // Validate password length
    if (formData.password.length < 6) {
      onError(translations?.passwordTooShort || 'Password must be at least 6 characters');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      onError(translations?.invalidEmailFormat || 'Invalid email format');
      return;
    }
    
    // For existing user mode
    if (addMode === 'existing') {
      if (!selectedUser) {
        onError(translations?.selectUser || 'Please select a user');
        return;
      }
      
      try {
        setActionLoading('add');
        
        // Check if user is already associated with this company
        const isAlreadyCompanyUser = users.some(user => user.uid === selectedUser.uid);
        if (isAlreadyCompanyUser) {
          onError(translations?.userAlreadyAssociated || 'This user is already associated with this company');
          setActionLoading(null);
          return;
        }
        
        // Update existing user to company role and link to company
        await updateDoc(doc(db, 'users', selectedUser.uid), {
          role: 'company',
          companyId: company.id,
          updatedAt: new Date()
        });
        
        // Add to local state with updated role
        const updatedUser: User = {
          ...selectedUser,
          role: 'company',
          companyId: company.id,
          updatedAt: new Date()
        };
        
        setUsers(prev => [...prev, updatedUser]);
        
        // Update company to claimed if not already
        if (!company.claimed) {
          await updateDoc(doc(db, 'companies', company.id), {
            claimed: true,
            updatedAt: new Date()
          });
          
          onSuccess(translations?.companyUserAddedAndClaimed || 'User added and company marked as claimed successfully');
        } else {
          onSuccess(translations?.companyUserAdded || 'User added successfully');
        }
        
        // Reset form
        setSelectedUser(null);
        setSearchUserQuery('');
        setSearchResults([]);
        setShowAddUserForm(false);
        
        return;
      } catch (error) {
        console.error('Error adding existing user:', error);
        onError(translations?.failedToAddUser || 'Failed to add user');
        setActionLoading(null);
        return;
      }
    }
    
    try {
      setActionLoading('add');
      
      // Check if email is already in use for this company
      const emailCheckQuery = query(
        collection(db, 'users'),
        where('email', '==', formData.email),
        where('companyId', '==', company.id)
      );
      const emailCheckSnapshot = await getDocs(emailCheckQuery);
      
      if (!emailCheckSnapshot.empty) {
        onError(translations?.emailAlreadyInUse || 'This email is already associated with this company');
        setActionLoading(null);
        return;
      }
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: formData.email,
        displayName: formData.displayName,
        role: 'company',
        companyId: company.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        isEmailVerified: false
      });
      
      // Add the new user to the local state
      const newUser: User = {
        uid: userCredential.user.uid,
        email: formData.email,
        displayName: formData.displayName,
        role: 'company',
        companyId: company.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        isEmailVerified: false
      };
      
      setUsers(prev => [...prev, newUser]);
      
      // Update company to claimed if not already
      if (!company.claimed) {
        await updateDoc(doc(db, 'companies', company.id), {
          claimed: true,
          updatedAt: new Date()
        });
      }
      
      // Update the company as claimed if it's not already
      if (!company.claimed) {
        onSuccess(translations?.companyUserAddedAndClaimed || 'User added and company marked as claimed successfully');
      } else {
        onSuccess(translations?.companyUserAdded || 'User added successfully');
      }
      
      // Reset the form
      setFormData({
        email: '',
        displayName: '',
        password: ''
      });
      
      setShowAddUserForm(false);
    } catch (error: any) {
      console.error('Error adding user:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        onError(translations?.emailAlreadyInUse || 'This email is already in use by another account');
      } else {
        onError(translations?.failedToAddUser || 'Failed to add user');
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Handle searching for existing users
  const handleSearchUsers = async () => {
    if (!searchUserQuery.trim()) return;
    
    try {
      setSearchLoading(true);
      setSearchResults([]);
      
      // Query all users (we'll filter client-side)
      const usersQuery = query(collection(db, 'users'));
      const snapshot = await getDocs(usersQuery);
      
      // Filter users by search query (name or email)
      const matchingUsers = snapshot.docs
        .map(doc => ({
          uid: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        }))
        .filter(user => {
          const searchLower = searchUserQuery.toLowerCase();
          return (
            user.displayName.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower)
          );
        })
        // Exclude users already associated with this company
        .filter(user => !users.some(existingUser => existingUser.uid === user.uid))
        // Sort by relevance (exact match first)
        .sort((a, b) => {
          const aNameExact = a.displayName.toLowerCase() === searchUserQuery.toLowerCase();
          const bNameExact = b.displayName.toLowerCase() === searchUserQuery.toLowerCase();
          const aEmailExact = a.email.toLowerCase() === searchUserQuery.toLowerCase();
          const bEmailExact = b.email.toLowerCase() === searchUserQuery.toLowerCase();
          
          if (aNameExact && !bNameExact) return -1;
          if (!aNameExact && bNameExact) return 1;
          if (aEmailExact && !bEmailExact) return -1;
          if (!aEmailExact && bEmailExact) return 1;
          return 0;
        }) as User[];
      
      setSearchResults(matchingUsers);
    } catch (error) {
      console.error('Error searching users:', error);
      onError(translations?.failedToSearchUsers || 'Failed to search users');
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle selecting a user from search results
  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSearchUserQuery(user.email);
    setSearchResults([]);
  };

  // Handle deleting a user
  const handleDeleteUser = async (user: User) => {
    try {
      setActionLoading(user.uid);
      
      // Check if this is the last user for this company
      const isLastUser = users.length === 1;
      
      // Delete the user document from Firestore
      await deleteDoc(doc(db, 'users', user.uid));
      
      // Update the local state
      setUsers(prev => prev.filter(u => u.uid !== user.uid));
      
      // Show success message
      if (isLastUser) {
        onSuccess(translations?.lastCompanyUserRemoved || 'Last company user removed successfully');
      } else {
        onSuccess(translations?.companyUserRemoved || 'Company user removed successfully');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      onError(translations?.failedToDeleteUser || 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Plus className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {translations?.manageCompanyUsers || 'Manage Company Users'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Company Info */}
          <div className="bg-gray-50 p-4 rounded-xl mb-6">
            <div className="flex items-center space-x-3 rtl:space-x-reverse mb-1">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                {company.logoUrl ? (
                  <img 
                    src={company.logoUrl} 
                    alt={company.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="h-5 w-5 text-gray-500" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{company.name}</h3>
                <p className="text-sm text-gray-600">{company.email}</p>
                <p className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full inline-block mt-1">
                  {company.claimed ? 
                    (translations?.claimed || 'Claimed') : 
                    (translations?.notClaimed || 'Not Claimed')
                  }
                <span>{translations?.addUser || 'Add User'}</span>
              </div>
            </div>
          </div>

          {/* Search and Add User Button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0 mb-6">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder={translations?.searchUsers || 'Search users...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <button
              onClick={() => setShowAddUserForm(true)}
              disabled={showAddUserForm}
              className="w-full sm:w-auto bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 flex items-center justify-center space-x-2 rtl:space-x-reverse"
            >
              <Plus className="h-4 w-4" />
              <span>{translations?.addUser || 'Add User'}</span>
            </button>
          </div>

          {/* Add User Form */}
          {showAddUserForm && (
            <div className="bg-gray-50 p-4 rounded-xl mb-6 animate-fadeIn">
              <h4 className="font-medium text-gray-900 mb-2">
                {translations?.addNewCompanyUser || 'Add New Company User'}
              </h4>
              
              {/* Mode selector tabs */}
              <div className="mb-4 border-b border-gray-200">
                <div className="flex">
                  <button
                    type="button"
                    className={`py-2 px-4 border-b-2 font-medium text-sm ${
                      addMode === 'new' 
                        ? 'border-purple-500 text-purple-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    onClick={() => setAddMode('new')}
                  >
                    {translations?.createNewUser || 'Create New User'}
                  </button>
                  <button
                    type="button"
                    className={`py-2 px-4 border-b-2 font-medium text-sm ${
                      addMode === 'existing' 
                        ? 'border-purple-500 text-purple-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setAddMode('existing');
                      // Clear selected user when switching modes
                      setSelectedUser(null);
                    }}
                  >
                    {translations?.useExistingUser || 'Use Existing User'}
                  </button>
                </div>
              </div>

              {addMode === 'new' ? (
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {translations?.fullName || 'Full Name'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder={translations?.enterFullName || 'Enter full name'}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {translations?.email || 'Email'} *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder={translations?.enterEmail || 'Enter email address'}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {translations?.password || 'Password'} *
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder={translations?.enterPassword || 'Enter password (min 6 characters)'}
                      minLength={6}
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-2">
                    <button
                      type="submit"
                      disabled={actionLoading === 'add'}
                      className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
                    >
                      {actionLoading === 'add' ? (
                        <Loader className="animate-spin h-5 w-5" />
                      ) : (
                        <span>{translations?.addUser || 'Add User'}</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddUserForm(false)}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200"
                    >
                      {translations?.cancel || 'Cancel'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  {/* Search for existing users */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {translations?.searchExistingUsers || 'Search Existing Users'} *
                    </label>
                    <div className="flex space-x-2 rtl:space-x-reverse">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={searchUserQuery}
                          onChange={(e) => setSearchUserQuery(e.target.value)}
                          placeholder={translations?.searchByEmailName || 'Search by email or name'}
                          className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSearchUsers}
                        disabled={searchLoading || !searchUserQuery.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                      >
                        {searchLoading ? (
                          <RefreshCw className="h-5 w-5 animate-spin" />
                        ) : (
                          <Search className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Search Results */}
                  {searchLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader className="animate-spin h-6 w-6 text-blue-500" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-700">
                          {translations?.searchResults || 'Search Results'} ({searchResults.length})
                        </p>
                      </div>
                      <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                        {searchResults.map(user => (
                          <div 
                            key={user.uid}
                            className={`p-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer ${
                              selectedUser?.uid === user.uid ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => handleSelectUser(user)}
                          >
                            <div className="flex items-center space-x-3 rtl:space-x-reverse">
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                {user.photoURL ? (
                                  <img
                                    src={user.photoURL}
                                    alt={user.displayName}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  <User className="h-4 w-4 text-gray-500" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                                <span className="text-xs bg-gray-100 text-gray-700 px-1 py-0.5 rounded mt-1 inline-block">
                                  {user.role === 'admin' 
                                    ? (translations?.admin || 'Admin') 
                                    : user.role === 'company'
                                      ? (translations?.companyRole || 'Company')
                                      : (translations?.userRole || 'User')}
                                </span>
                              </div>
                            </div>
                            {selectedUser?.uid === user.uid && (
                              <Check className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : searchUserQuery && !searchLoading ? (
                    <div className="bg-gray-100 p-4 rounded-lg text-center">
                      <p className="text-gray-500">{translations?.noUsersFound || 'No users found'}</p>
                    </div>
                  ) : null}

                  {/* Selected User */}
                  {selectedUser && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        {translations?.selectedUser || 'Selected User'}:
                      </p>
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-blue-800">{selectedUser.displayName}</p>
                          <p className="text-sm text-blue-600">{selectedUser.email}</p>
                        </div>
                      </div>
                      
                      {selectedUser.role !== 'company' && (
                        <div className="mt-2 bg-yellow-50 border border-yellow-100 rounded-lg p-2 text-sm text-yellow-800">
                          <AlertCircle className="h-4 w-4 inline-block mr-1" />
                          {translations?.roleWillBeChanged || 'User role will be changed to company'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons for existing user */}
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-2">
                    <button
                      onClick={handleAddUser}
                      disabled={actionLoading === 'add' || !selectedUser}
                      className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
                    >
                      {actionLoading === 'add' ? (
                        <Loader className="animate-spin h-5 w-5" />
                      ) : (
                        <span>{translations?.addUser || 'Add User'}</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddUserForm(false)}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200"
                    >
                      {translations?.cancel || 'Cancel'}
                    </button>
                </div>
              )}
            </div>
          )}

          {/* Users List */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              {translations?.companyUsers || 'Company Users'} ({filteredUsers.length})
            </h4>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="animate-spin h-8 w-8 text-purple-500" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="h-8 w-8 text-gray-400" />
                </div>
                {searchQuery ? (
                  <p className="text-gray-500">
                    {translations?.noUsersMatchSearch || 'No users match your search'}
                  </p>
                ) : (
                  <p className="text-gray-500">
                    {translations?.noCompanyUsers || 'This company has no users yet'}
                  </p>
                )}
                {!searchQuery && (
                  <button
                    onClick={() => setShowAddUserForm(true)}
                    className="mt-4 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 inline-flex items-center space-x-2 rtl:space-x-reverse"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{translations?.addFirstUser || 'Add First User'}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map(user => (
                  <div 
                    key={user.uid}
                    className="bg-gray-50 rounded-lg p-4 flex justify-between items-center"
                  >
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <Mail className="h-5 w-5 text-purple-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="font-medium text-gray-900">{user.displayName}</h5>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      disabled={actionLoading === user.uid}
                      className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition-colors duration-200"
                      title={translations?.removeUser || 'Remove User'}
                    >
                      {actionLoading === user.uid ? (
                        <Loader className="animate-spin h-5 w-5" />
                      ) : (
                        <Trash2 className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {translations?.close || 'Close'}
          </button>
        </div>
      </div>
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ManageUsersModal;