'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './firebase';

export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isGuest?: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => void;
  logOut: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInAsGuest: () => {},
  logOut: async () => {},
  authError: null,
  clearAuthError: () => {},
});

const GUEST_STORAGE_KEY = 'smriti_guest_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check if guest user was previously active
    const savedGuest = typeof window !== 'undefined' ? localStorage.getItem(GUEST_STORAGE_KEY) : null;
    let initialGuest: AppUser | null = null;
    if (savedGuest) {
      try {
        initialGuest = JSON.parse(savedGuest);
      } catch {
        // ignore invalid json
      }
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (currentUser) {
          setUser({
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            isGuest: false,
          });
          // Remove guest token if real user logs in
          if (typeof window !== 'undefined') {
            localStorage.removeItem(GUEST_STORAGE_KEY);
          }
        } else if (initialGuest) {
          setUser(initialGuest);
        } else {
          setUser(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Auth state error:', error);
        if (initialGuest) {
          setUser(initialGuest);
        } else {
          setAuthError(error.message);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        setUser({
          uid: result.user.uid,
          displayName: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
          isGuest: false,
        });
      }
    } catch (err: unknown) {
      console.error('Sign-in error:', err);
      let friendlyMsg = 'Google sign-in failed. Please try again.';

      if (err && typeof err === 'object') {
        const errorObj = err as { code?: string; message?: string };
        if (
          errorObj.code === 'auth/configuration-not-found' ||
          (errorObj.message && errorObj.message.includes('configuration-not-found'))
        ) {
          friendlyMsg =
            'Google Sign-in is not yet enabled in the Firebase Authentication console. You can click "Enter Guest Sanctuary" to explore with full features immediately.';
        } else if (
          errorObj.code === 'auth/popup-closed-by-user' ||
          (errorObj.message && errorObj.message.includes('popup-closed-by-user'))
        ) {
          friendlyMsg = 'The sign-in popup was closed before completing.';
        } else if (
          errorObj.code === 'auth/unauthorized-domain' ||
          (errorObj.message && errorObj.message.includes('unauthorized-domain'))
        ) {
          friendlyMsg =
            'This domain is not authorized for OAuth in Firebase Console. Add this preview URL to Firebase Auth > Settings > Authorized Domains, or continue as Guest.';
        } else if (errorObj.message) {
          friendlyMsg = errorObj.message;
        }
      }

      setAuthError(friendlyMsg);
      throw err;
    }
  };

  const signInAsGuest = () => {
    setAuthError(null);
    const guestUser: AppUser = {
      uid: 'guest_sanctuary_user',
      displayName: 'Guest Sanctuary Explorer',
      email: 'guest@smriti.memorial',
      photoURL: null,
      isGuest: true,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestUser));
    }
    setUser(guestUser);
  };

  const logOut = async () => {
    setAuthError(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(GUEST_STORAGE_KEY);
    }
    try {
      await signOut(auth);
    } catch (err: unknown) {
      console.error('Sign-out error:', err);
    } finally {
      setUser(null);
    }
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInAsGuest,
        logOut,
        authError,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

