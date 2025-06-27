import React, { useState, useRef } from 'react';
import { User, Mail, Lock, Camera, Save, ArrowLeft, Eye, EyeOff, CheckCircle, AlertCircle, Key } from 'lucide-react';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { auth, storage, db } from '../config/firebase';

interface PersonalProfileProps {
  onNavigate: (page: string) => void;
}

const PersonalProfile: React.FC<PersonalProfileProps> = ({ onNavigate }) => {
  const { currentUser, firebaseUser } = useAuth();
  const { translations } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    displayName: currentUser?.displayName || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Compress image before upload
  const compressImage = (file: File, maxWidth: number = 400, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // Upload profile photo
  const uploadProfilePhoto = async (file: File): Promise<string> => {
    try {
      const compressedFile = await compressImage(file);
      
      const timestamp = Date.now();
      const fileExtension = compressedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${currentUser?.uid}_${timestamp}.${fileExtension}`;
      const storageRef = ref(storage, `profile-photos/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, compressedFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  };

  // Delete old profile photo
  const deleteOldPhoto = async (photoURL: string) => {
    try {
      const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/r8estate-2a516.firebasestorage.app/o/';
      if (photoURL.startsWith(baseUrl)) {
        const filePath = decodeURIComponent(photoURL.replace(baseUrl, '').split('?')[0]);
        const storageRef = ref(storage, filePath);
        await deleteObject(storageRef);
      }
    } catch (error) {
      console.error('Error deleting old photo:', error);
    }
  };

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload an image file.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size too large. Please upload an image under 5MB.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setPhotoLoading(true);
      setError('');
      
      // Delete old photo if exists
      if (firebaseUser.photoURL) {
        await deleteOldPhoto(firebaseUser.photoURL);
      }

      // Upload new photo
      const photoURL = await uploadProfilePhoto(file);
      
      // Update Firebase profile
      await updateProfile(firebaseUser, { photoURL });
      
      // Update Firestore document
      if (currentUser) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          photoURL: photoURL,
          updatedAt: new Date()
        });
      }

      setSuccess('Profile photo updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error updating photo:', error);
      setError('Failed to update profile photo');
      setTimeout(() => setError(''), 3000);
    } finally {
      setPhotoLoading(false);
    }
  };

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firebaseUser || !currentUser) {
      setError('No user logged in');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!formData.displayName.trim()) {
      setError('Display name is required');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Update Firebase profile
      await updateProfile(firebaseUser, {
        displayName: formData.displayName.trim()
      });
      
      // Update Firestore document
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: formData.displayName.trim(),
        updatedAt: new Date()
      });

      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firebaseUser) {
      setError('No user logged in');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('Please fill in all password fields');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(
        firebaseUser.email!,
        formData.currentPassword
      );
      await reauthenticateWithCredential(firebaseUser, credential);
      
      // Update password
      await updatePassword(firebaseUser, formData.newPassword);
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      setShowChangePassword(false);
      setSuccess('Password updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/wrong-password') {
        setError('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        setError('New password is too weak');
      } else {
        setError('Failed to update password');
      }
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Get role display name
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'user':
        return 'User';
      case 'company':
        return 'Company';
      default:
        return role;
    }
  };

  if (!currentUser || currentUser.role === 'company') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mb-6">This page is only available for users and administrators.</p>
          <button
            onClick={() => onNavigate('home')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-4 rtl:space-x-reverse mb-6">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600 hover:text-gray-800 transition-colors duration-200 rounded-lg hover:bg-gray-100 p-2"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Home</span>
            </button>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-lg" style={{ backgroundColor: '#194866' }}>
              <User className="h-8 w-8" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#194866' }}>
              Personal Profile
            </h1>
            <p className="text-lg text-gray-600">
              Manage your personal information and account settings
            </p>
          </div>
        </div>
      </section>

      {/* Success/Error Messages */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 rtl:space-x-reverse">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center space-x-3 rtl:space-x-reverse">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            <p className="text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          
          {/* Profile Photo Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-3 rtl:space-x-reverse">
              <Camera className="h-6 w-6" style={{ color: '#194866' }} />
              <span>Profile Photo</span>
            </h2>
            
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 rtl:space-x-reverse">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden shadow-lg bg-gray-100 flex items-center justify-center">
                  {firebaseUser?.photoURL ? (
                    <img
                      src={firebaseUser.photoURL}
                      alt={currentUser.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-16 w-16 text-gray-400" />
                  )}
                </div>
                
                {photoLoading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Update Your Photo
                </h3>
                <p className="text-gray-600 mb-4 text-sm">
                  Choose a clear photo that represents you professionally. 
                  <br />Max size: 5MB. Formats: JPG, PNG, GIF, WebP
                </p>
                
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoLoading}
                  className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                  style={{ backgroundColor: '#194866' }}
                  onMouseEnter={(e) => {
                    if (!photoLoading) {
                      e.target.style.backgroundColor = '#0f3147';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!photoLoading) {
                      e.target.style.backgroundColor = '#194866';
                    }
                  }}
                >
                  <Camera className="h-4 w-4" />
                  <span>
                    {photoLoading ? 'Uploading...' : 'Change Photo'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-3 rtl:space-x-reverse">
              <User className="h-6 w-6" style={{ color: '#194866' }} />
              <span>Basic Information</span>
            </h2>
            
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
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
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="email"
                      value={currentUser.email}
                      disabled
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Email cannot be changed. Contact support if needed.
                  </p>
                </div>

                {/* Role (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Type
                  </label>
                  <input
                    type="text"
                    value={getRoleDisplayName(currentUser.role)}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>

                {/* Email Verification Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Verification
                  </label>
                  <div className={`flex items-center space-x-2 rtl:space-x-reverse px-4 py-3 rounded-xl ${
                    currentUser.isEmailVerified 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  }`}>
                    <CheckCircle className={`h-5 w-5 ${currentUser.isEmailVerified ? 'text-green-500' : 'text-yellow-500'}`} />
                    <span className="font-medium">
                      {currentUser.isEmailVerified ? 'Verified' : 'Not Verified'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 rtl:space-x-reverse px-6 py-3 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                  style={{ backgroundColor: '#194866' }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.backgroundColor = '#0f3147';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.target.style.backgroundColor = '#194866';
                    }
                  }}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Save className="h-5 w-5" />
                  )}
                  <span>{loading ? 'Updating...' : 'Update Profile'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Password Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-3 rtl:space-x-reverse">
              <Key className="h-6 w-6" style={{ color: '#194866' }} />
              <span>Password & Security</span>
            </h2>
            
            {!showChangePassword ? (
              <div className="text-center py-8">
                <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Change Your Password
                </h3>
                <p className="text-gray-600 mb-6">
                  Keep your account secure by updating your password regularly
                </p>
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="flex items-center space-x-2 rtl:space-x-reverse px-6 py-3 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl mx-auto"
                  style={{ backgroundColor: '#194866' }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#0f3147';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#194866';
                  }}
                >
                  <Lock className="h-5 w-5" />
                  <span>Change Password</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        required
                        value={formData.currentPassword}
                        onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                        className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
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
                        placeholder="Enter your current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={formData.newPassword}
                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                        className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
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
                        placeholder="Enter new password (min 6 characters)"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        type="password"
                        required
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
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
                        placeholder="Confirm your new password"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 rtl:space-x-reverse">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center space-x-2 rtl:space-x-reverse px-6 py-3 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                    style={{ backgroundColor: '#194866' }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.target.style.backgroundColor = '#0f3147';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.target.style.backgroundColor = '#194866';
                      }
                    }}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Save className="h-5 w-5" />
                    )}
                    <span>{loading ? 'Updating...' : 'Update Password'}</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePassword(false);
                      setFormData(prev => ({
                        ...prev,
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      }));
                    }}
                    className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-400 transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalProfile;