import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Mail, AlertCircle, Check, Loader, Search } from 'lucide-react';
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
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    password: ''
  });

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
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
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
              <h4 className="font-medium text-gray-900 mb-3">
                {translations?.addNewCompanyUser || 'Add New Company User'}
              </h4>
              
              // Update company to claimed if not already
              if (!company.claimed) {
                await updateDoc(doc(db, 'companies', company.id), {
                  claimed: true,
                  updatedAt: new Date()
                });
              }
              
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
            </div>
          )}

          {/* Users List */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              {translations?.companyUsers || 'Company Users'} ({users.length})
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
                      <div>
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