// src/services/authService.js
// Handles Firebase Authentication operations

import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';

// ─── ROLES ─────────────────────────────────────────────────────────────────
// Define which modules each role can access
export const ROLES = {
  admin: 'admin',
  inventory_manager: 'inventory_manager',
  sales: 'sales',
  accountant: 'accountant',
};

export const ROLE_PERMISSIONS = {
  admin: ['dashboard', 'inventory', 'bookings', 'accounting', 'notifications', 'users'],
  inventory_manager: ['inventory', 'notifications'],
  sales: ['bookings', 'inventory', 'notifications'],
  accountant: ['accounting', 'notifications'],
};

// ─── AUTH OPERATIONS ────────────────────────────────────────────────────────

/**
 * Sign in an existing user with email/password.
 * Fetches their Firestore profile to get role + display name.
 */
export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
  if (!userDoc.exists()) throw new Error('User profile not found.');
  return { uid: userCredential.user.uid, ...userDoc.data() };
};

/**
 * Sign out the current user.
 */
export const logoutUser = () => signOut(auth);

/**
 * Create a new user (admin only). Stores their profile in Firestore.
 * @param {string} email
 * @param {string} password
 * @param {string} displayName
 * @param {string} role - one of ROLES values
 */
export const createUser = async (email, password, displayName, role) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(userCredential.user, { displayName });

  const userProfile = {
    uid: userCredential.user.uid,
    email,
    displayName,
    role,
    createdAt: new Date().toISOString(),
    active: true,
  };

  await setDoc(doc(db, 'users', userCredential.user.uid), userProfile);
  return userProfile;
};

/**
 * Fetch a user's profile from Firestore by UID.
 */
export const getUserProfile = async (uid) => {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) return null;
  return { uid, ...userDoc.data() };
};

/**
 * Fetch all users (admin only).
 */
export const getAllUsers = async () => {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map((d) => ({ uid: d.id, ...d.data() }));
};

/**
 * Update a user's role (admin only).
 */
export const updateUserRole = async (uid, role) => {
  await updateDoc(doc(db, 'users', uid), { role });
};

/**
 * Deactivate a user account (soft delete).
 */
export const deactivateUser = async (uid) => {
  await updateDoc(doc(db, 'users', uid), { active: false });
};

/**
 * Check if a user has permission to access a specific module.
 * @param {string} role
 * @param {string} module
 * @returns {boolean}
 */
export const hasPermission = (role, module) => {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(module);
};
