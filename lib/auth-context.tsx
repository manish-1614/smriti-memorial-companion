'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './firebase';

export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  logOut: async () => {},
  getIdToken: async () => null,
  authError: null,
  clearAuthError: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (currentUser) {
          setUser({
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Auth state error:', error);
        setAuthError(error.message);
        setUser(null);
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
            'Google Sign-in is not yet enabled in the Firebase Authentication console. Please enable Google provider in Firebase Auth.';
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
            'This domain is not authorized for OAuth in Firebase Console. Please add this domain to Firebase Auth > Settings > Authorized Domains.';
        } else if (errorObj.message) {
          friendlyMsg = errorObj.message;
        }
      }

      setAuthError(friendlyMsg);
      throw err;
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken(false);
    } catch (err) {
      console.error('Failed to get user ID token:', err);
      return null;
    }
  };

  const logOut = async () => {
    setAuthError(null);
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
        logOut,
        getIdToken,
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

