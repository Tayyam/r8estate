import React, { useEffect, useRef } from 'react';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';

interface GoogleOneTapProps {
  onSuccess?: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, options: any) => void;
          prompt: (config?: any) => void;
          cancel: () => void;
        };
      };
    };
  }
}

const GoogleOneTap: React.FC<GoogleOneTapProps> = ({ onSuccess }) => {
  const { currentUser } = useAuth();
  const { showSuccessToast, showErrorToast } = useNotification();
  const { translations } = useLanguage();
  const googleScriptLoaded = useRef(false);
  
  useEffect(() => {
    // Don't show One Tap if user is already logged in
    if (currentUser) return;
    
    // Load Google Identity Services script
    const loadGoogleScript = () => {
      // If script is already loaded or being loaded, skip
      if (googleScriptLoaded.current || document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        return;
      }
      
      googleScriptLoaded.current = true;
      
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleOneTap;
      document.head.appendChild(script);
    };
    
    const initializeGoogleOneTap = () => {
      if (!window.google || !window.google.accounts || !window.google.accounts.id) {
        console.error('Google Identity Services not loaded properly');
        return;
      }
      
      window.google.accounts.id.initialize({
        client_id: '966003063761-7q49r1tgb5idc5ikvf5vtcrbsrg7lqhc.apps.googleusercontent.com', // Use your Firebase Web Client ID
        callback: handleCredentialResponse,
        auto_select: true,
        cancel_on_tap_outside: true,
      });
      
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // One Tap is not displayed or was skipped
          console.log('One Tap not displayed or skipped', notification);
        }
      });
    };
    
    const handleCredentialResponse = async (response: any) => {
      try {
        const idToken = response.credential;
        const credential = GoogleAuthProvider.credential(idToken);
        
        // Sign in with Firebase using the Google credential
        const userCredential = await signInWithCredential(auth, credential);
        const user = userCredential.user;
        
        // Check if user exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        // If user doesn't exist, create a new document
        if (!userDoc.exists()) {
          await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            displayName: user.displayName || user.email,
            role: 'user', // Default role for social logins
            createdAt: new Date(),
            updatedAt: new Date(),
            isEmailVerified: user.emailVerified,
            photoURL: user.photoURL
          });
        }
        
        // Show success toast
        showSuccessToast(
          translations?.loginSuccess || 'Login Successful!',
          translations?.welcomeToR8Estate || 'Welcome to R8 Estate! Your account has been created and you are now logged in.'
        );
        
        if (onSuccess) onSuccess();
        
      } catch (error: any) {
        console.error('Google One Tap error:', error);
        showErrorToast(
          translations?.socialLoginError || 'Sign-in Failed',
          translations?.socialLoginErrorDesc || 'Failed to sign in with Google. Please try again.'
        );
      }
    };
    
    loadGoogleScript();
    
    // Cleanup
    return () => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, [currentUser]);

  // This component doesn't render anything visible
  return null;
};

export default GoogleOneTap;