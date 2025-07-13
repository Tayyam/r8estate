import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db, functions } from '../config/firebase';
import { User, UserRole } from '../types/user';
import { httpsCallable } from 'firebase/functions';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, role?: UserRole) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user data from Firestore
  const loadUserData = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        console.log("User document found:", userDoc.id);
        const userData = userDoc.data();
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: userData.displayName || firebaseUser.displayName || '',
          role: userData.role || 'user',
          createdAt: userData.createdAt?.toDate() || new Date(),
          updatedAt: userData.updatedAt?.toDate() || new Date(),
          companyId: userData.companyId,
          isEmailVerified: firebaseUser.emailVerified,
          photoURL: firebaseUser.photoURL || userData.photoURL
        };
      } else {
        console.log("No user document found for Firebase user:", firebaseUser.uid);
        return null;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      return null;
    }
  };

  // Register new user
  const register = async (email: string, password: string, displayName: string, role: UserRole = 'user') => {
    try {
      // Create the user with email/password
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update Firebase profile
      await updateProfile(user, { displayName });

      // Create user document in Firestore
      const userData: Omit<User, 'uid'> = {
        email: user.email!,
        displayName,
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
        isEmailVerified: user.emailVerified
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      // Send email verification
      await sendEmailVerification(user);
      
      // No need to manually sign in since createUserWithEmailAndPassword
      // already signs the user in. Just update the current user state.
      const newUserData: User = {
        uid: user.uid,
        ...userData
      };
      
      setCurrentUser(newUserData);
      setFirebaseUser(user);
      
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message);
    }
  };

  // Login with email and password
  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message);
    }
  };
  
  // Login with Google
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      // If user doesn't exist, create a new document
      if (!userDoc.exists()) {
        const userData: Omit<User, 'uid'> = {
          email: user.email!,
          displayName: user.displayName || user.email!,
          role: 'user', // Default role for social logins
          createdAt: new Date(),
          updatedAt: new Date(),
          isEmailVerified: user.emailVerified,
          photoURL: user.photoURL
        };
        
        await setDoc(doc(db, 'users', user.uid), userData);
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      throw new Error(error.message);
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      // Generate password reset link from Firebase
      const actionCodeSettings = {
        // URL you want to redirect back to after password reset
        url: `${window.location.origin}/login`,
        // Handle the reset code in the app
        handleCodeInApp: false
      };

      // Generate auth URL for password reset
      // Get the API key from the Firebase config
      const firebaseApiKey = auth.app.options.apiKey;
      const resetLink = `${window.location.origin}/reset-password?mode=resetPassword&oobCode=PLACEHOLDER&apiKey=${firebaseApiKey}`;
      
      // Send email using our custom function
      const sendEmailFunction = httpsCallable(functions, 'sendEmail');
      const result = await sendEmailFunction({
        to: email,
        subject: 'Reset Your R8 Estate Password',
        templateType: 'password-reset',
        templateData: {
          resetLink
        }
      });
      
      // Check if the function returned success
      const data = result.data as any;
      if (!data.success) {
        throw new Error('Failed to send password reset email');
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw new Error(error.message);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (error: any) {
      console.error('Logout error:', error);
      throw new Error(error.message);
    }
  };

  // Update user profile
  const updateUserProfile = async (updates: Partial<User>) => {
    if (!firebaseUser) throw new Error('No user logged in');

    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date()
      });

      // Update local state
      if (currentUser) {
        setCurrentUser({ ...currentUser, ...updates, updatedAt: new Date() });
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      throw new Error(error.message);
    }
  };

  // Auth state observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      
      if (user) {
        setFirebaseUser(user);
        const userData = await loadUserData(user);
        setCurrentUser(userData);
      } else {
        setFirebaseUser(null);
        setCurrentUser(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    firebaseUser,
    loading,
    login,
    register,
    loginWithGoogle,
    logout,
    resetPassword,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};