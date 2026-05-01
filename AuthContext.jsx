// src/contexts/AuthContext.jsx
// Provides authentication state and current user throughout the app

import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUserProfile, hasPermission } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);          // Full user profile (with role)
  const [loading, setLoading] = useState(true);     // True while resolving auth state

  useEffect(() => {
    // Firebase listener — fires on login/logout/token refresh
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          setUser(profile);
        } catch (e) {
          console.error('Failed to load user profile', e);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe; // Cleanup listener on unmount
  }, []);

  /**
   * Convenience helper — check if the logged-in user can access a module.
   * @param {string} module
   * @returns {boolean}
   */
  const can = (module) => {
    if (!user) return false;
    return hasPermission(user.role, module);
  };

  const value = { user, setUser, loading, can };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
