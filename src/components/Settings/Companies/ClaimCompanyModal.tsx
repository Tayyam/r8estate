import React, { useState , useEffect } from 'react';
import { UserPlus, AlertCircle, Lock, Mail, User, Building2, Search, RefreshCw } from 'lucide-react';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { doc, updateDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../../config/firebase';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Company } from '../../../types/company';
import { User as UserType } from '../../../types/user';

interface ClaimCompanyModalProps {
  company: Company;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const ClaimCompanyModal: React.FC<ClaimCompanyModalProps> = ({
  company,
  onClose,
  onSuccess,
  onError
}) => {
  const { translations } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [claimMode, setClaimMode] = useState<'new' | 'existing'>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserType[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: company.email || '',
    password: '',
    confirmPassword: ''
  });

  // Handle user search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setSearchLoading(true);
      setSearchResults([]);
      
      // Search for users by email or display name
      const usersQuery = query(
        collection(db, 'users')
        // Removed role filter to show all users
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      
      // Filter results client-side based on search query
      const filteredUsers = usersSnapshot.docs
        .map(doc => ({
          uid: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          role: doc.data().role || 'user'
        }))
        .filter(user => 
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
          // Sort by match priority - exact matches first, then startsWith, then includes
          const aNameMatch = a.displayName.toLowerCase().includes(searchQuery.toLowerCase());
          const bNameMatch = b.displayName.toLowerCase().includes(searchQuery.toLowerCase());
          const aEmailMatch = a.email.toLowerCase().includes(searchQuery.toLowerCase());
          const bEmailMatch = b.email.toLowerCase().includes(searchQuery.toLowerCase());
          
          if (aNameMatch && !bNameMatch) return -1;
          if (!aNameMatch && bNameMatch) return 1;
          if (aEmailMatch && !bEmailMatch) return -1;
          if (!aEmailMatch && bEmailMatch) return 1;
          
          // If both match equally, sort by name
          return a.displayName.localeCompare(b.displayName);
        }) as UserType[];
      
      // Always show some results if available, even on initial load
      setSearchResults(filteredUsers.length > 0 ? filteredUsers : 
        !searchQuery.trim() ? usersSnapshot.docs
          .map(doc => ({
            uid: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            role: doc.data().role || 'user'
          }))
          .slice(0, 10) as UserType[]
        : []);
    } catch (error) {
      console.error('Error searching users:', error);
      onError(translations?.failedToSearchUsers || 'Failed to search users');
    } finally {
      setSearchLoading(false);
    }
  };
  
  // Handle selecting a user from search results
  const handleSelectUser = (user: UserType) => {
    setSelectedUser(user);
    setSearchQuery(user.email);
    setSearchResults([]);
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };
  
  // Load initial users on mount
  useEffect(() => {
    const loadInitialUsers = async () => {
      try {
        setSearchLoading(true);
        
        const usersQuery = query(
          collection(db, 'users'),
          // Limit to first few users
          limit(10)
        );
        
        const usersSnapshot = await getDocs(usersQuery);
        const userData = usersSnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          role: doc.data().role || 'user'
        })) as UserType[];
        
        setSearchResults(userData);
      } catch (error) {
        console.error('Error loading initial users:', error);
      } finally {
        setSearchLoading(false);
      }
    };
    
    if (claimMode === 'existing') {
      loadInitialUsers();
    }
  }, [claimMode]);
  
  // Handle input changes for search (with debounce)
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    
    // If search input is empty, load initial users
    if (!value.trim()) {
      const loadInitialUsers = async () => {
        try {
          setSearchLoading(true);
          
          const usersQuery = query(
            collection(db, 'users'),
            // Limit to first few users
            limit(10)
          );
          
          const usersSnapshot = await getDocs(usersQuery);
          const userData = usersSnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            role: doc.data().role || 'user'
          })) as UserType[];
          
          setSearchResults(userData);
        } catch (error) {
          console.error('Error loading initial users:', error);
        } finally {
          setSearchLoading(false);
        }
      };
      
      loadInitialUsers();
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();  
    
    // Different validation and processing based on claim mode
    if (claimMode === 'new') {
      // Validate form data for new user
      if (!formData.email || !formData.password || !formData.confirmPassword) {
        onError(translations?.fillAllFields || 'Please fill in all fields');
        return;
      }
      
      // Validate password match
      if (formData.password !== formData.confirmPassword) {
        onError(translations?.passwordsDoNotMatch || 'Passwords do not match');
        return;
      }
      
      // Validate password length
      if (formData.password.length < 6) {
        onError(translations?.passwordTooShort || 'Password must be at least 6 characters long');
        return;
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        onError(translations?.invalidEmailFormat || 'Please enter a valid email address');
        return;
      }
    } else {
      // Validate selection for existing user
      if (!selectedUser) {
        onError(translations?.selectUser || 'Please select a user');
        return;
      }
    }
    
    try {
      setLoading(true);
      
      if (claimMode === 'new') {
        // Create user account with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const userId = userCredential.user.uid;
        
        // Create user document in Firestore
        await setDoc(doc(db, 'users', userId), {
          uid: userId,
          email: formData.email,
          displayName: company.name,
          role: 'company',
          companyId: company.id, // Link to company ID
          createdAt: new Date(),
          updatedAt: new Date(),
          isEmailVerified: false
        });
      } else {
        // Update existing user's role to company and link to company
        await updateDoc(doc(db, 'users', selectedUser!.uid), {
          role: 'company',
          companyId: company.id,
          updatedAt: new Date()
        });
      }
      
      // Update company document to mark as claimed
      await updateDoc(doc(db, 'companies', company.id), {
        claimed: true,
        email: formData.email, // Update company email to match user email
        updatedAt: new Date()
      });
      
      onSuccess(translations?.companyClaimedSuccess || 'Company claimed successfully');
      onClose();
    } catch (error: any) {
      console.error('Error claiming company:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        onError(translations?.emailAlreadyInUse || 'This email address is already in use');
      } else {
        onError(translations?.failedToClaimCompany || 'Failed to claim company');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {translations?.claimCompany || 'Claim Company'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Information */}
        <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
          <div className="flex items-start space-x-3 rtl:space-x-reverse">
            <AlertCircle className="h-6 w-6 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800">
                {translations?.aboutClaimingCompany || 'About Claiming a Company'}
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                {translations?.claimingCompanyDesc || 
                 'Claiming a company will create a user account that will be associated with this company profile. The user will be able to manage the company profile and respond to reviews.'}
              </p>
            </div>
          </div>
        </div>

        {/* Company Name Display */}
        <div className="px-6 pt-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {translations?.company || 'Company'}
            </label>
            <div className="flex items-center space-x-3 rtl:space-x-reverse p-3 bg-gray-50 rounded-lg">
              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="w-8 h-8 object-cover rounded"
                />
              ) : (
                <Building2 className="h-5 w-5 text-gray-500" />
              )}
              <span className="font-medium text-gray-900">{company.name}</span>
            </div>
          </div>
          
          {/* Claim Mode Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <div className="flex">
              <button
                type="button"
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  claimMode === 'new' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setClaimMode('new')}
              >
                {translations?.createNewUser || 'Create New User'}
              </button>
              <button
                type="button"
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  claimMode === 'existing' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setClaimMode('existing')}
              >
                {translations?.useExistingUser || 'Use Existing User'}
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6">
          {/* New User Form */}
          {claimMode === 'new' && (
            <div className="space-y-6">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  {translations?.email || 'Email'} *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder={translations?.enterEmail || 'Enter email address'}
                    className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  {translations?.password || 'Password'} *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={translations?.enterPassword || 'Enter password (min 6 characters)'}
                    minLength={6}
                  />
                </div>
              </div>
              
              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  {translations?.confirmPassword || 'Confirm Password'} *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={translations?.confirmPassword || 'Confirm password'}
                    minLength={6}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Existing User Selection */}
          {claimMode === 'existing' && (
            <div className="space-y-6">
              {/* User Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {translations?.searchExistingUsers || 'Search Existing Users'} *
                </label>
                <div className="flex space-x-2 rtl:space-x-reverse">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchInput(e.target.value)}
                      placeholder={translations?.searchByEmailName || 'Search by email or name'}
                      className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={searchLoading || !searchQuery.trim()}
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
              {searchResults.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                    <p className="text-sm font-medium text-gray-700">
                      {translations?.searchResults || 'Search Results'} ({searchResults.length})
                    </p>
                    {searchLoading && (
                      <RefreshCw className="h-4 w-4 animate-spin text-gray-500" />
                    )}
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
                            <p className="text-xs bg-gray-100 text-gray-700 px-1 py-0.5 rounded mt-1 inline-block">
                              {user.role === 'admin' ? (translations?.adminRole || 'Admin') :
                               user.role === 'company' ? (translations?.companyRole || 'Company') :
                               (translations?.userRole || 'User')}
                            </p>
                          </div>
                        </div>
                        {selectedUser?.uid === user.uid && (
                          <Check className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : searchQuery && !searchLoading && (
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-gray-500">
                    {translations?.noUsersFound || 'No users found. Try a different search term.'}
                  </p>
                </div>
              )}

              {/* Selected User */}
              {selectedUser && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {translations?.selectedUser || 'Selected User'}:
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="text-blue-800 font-medium">{selectedUser.displayName}</span>
                      <span className="text-blue-700">({selectedUser.email})</span>
                    </div>
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => setSelectedUser(null)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="mt-2 px-2 py-1 bg-yellow-50 border border-yellow-100 rounded text-xs text-yellow-800">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    {translations?.roleWillBeChanged || "User's role will be changed to company"}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {translations?.cancel || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading || (claimMode === 'existing' && !selectedUser)}
              className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2 rtl:space-x-reverse"
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>
                {loading 
                  ? (translations?.claiming || 'Claiming...') 
                  : (claimMode === 'new' 
                      ? (translations?.claimWithNewUser || 'Claim with New User')
                      : (translations?.claimWithExistingUser || 'Claim with Selected User')
                    )
                }
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClaimCompanyModal;