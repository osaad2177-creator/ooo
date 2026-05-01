// src/services/inventoryService.js
// Firestore CRUD for the Inventory module
// Collection: /products

import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, where, orderBy, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { addLog } from './logService';

const COL = 'products';

// ─── PRODUCT STATUS ─────────────────────────────────────────────────────────
export const PRODUCT_STATUS = {
  available: 'available',
  rented: 'rented',
  maintenance: 'maintenance',
};

// ─── READ ────────────────────────────────────────────────────────────────────

/** Fetch all products */
export const getAllProducts = async () => {
  const snap = await getDocs(query(collection(db, COL), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/** Fetch a single product by ID */
export const getProduct = async (id) => {
  const docSnap = await getDoc(doc(db, COL, id));
  if (!docSnap.exists()) throw new Error('Product not found');
  return { id: docSnap.id, ...docSnap.data() };
};

/** Fetch products by status */
export const getProductsByStatus = async (status) => {
  const snap = await getDocs(
    query(collection(db, COL), where('status', '==', status))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ─── WRITE ───────────────────────────────────────────────────────────────────

/**
 * Add a new product.
 * @param {object} data - { name, category, description, quantity, dailyRate, status }
 * @param {object} currentUser - logged-in user for audit log
 */
export const addProduct = async (data, currentUser) => {
  const payload = {
    ...data,
    status: data.status || PRODUCT_STATUS.available,
    quantity: Number(data.quantity) || 1,
    dailyRate: Number(data.dailyRate) || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: currentUser.uid,
  };

  const ref = await addDoc(collection(db, COL), payload);
  await addLog({
    action: 'product_created',
    entityId: ref.id,
    entityType: 'product',
    description: `Product "${data.name}" created`,
    userId: currentUser.uid,
    userName: currentUser.displayName,
  });

  return { id: ref.id, ...payload };
};

/**
 * Update an existing product.
 */
export const updateProduct = async (id, data, currentUser) => {
  const payload = { ...data, updatedAt: new Date().toISOString() };
  await updateDoc(doc(db, COL, id), payload);
  await addLog({
    action: 'product_updated',
    entityId: id,
    entityType: 'product',
    description: `Product "${data.name}" updated`,
    userId: currentUser.uid,
    userName: currentUser.displayName,
  });
};

/**
 * Delete a product (hard delete — admin only).
 */
export const deleteProduct = async (id, productName, currentUser) => {
  await deleteDoc(doc(db, COL, id));
  await addLog({
    action: 'product_deleted',
    entityId: id,
    entityType: 'product',
    description: `Product "${productName}" deleted`,
    userId: currentUser.uid,
    userName: currentUser.displayName,
  });
};

/**
 * Update only the status field of a product.
 */
export const updateProductStatus = async (id, status) => {
  await updateDoc(doc(db, COL, id), {
    status,
    updatedAt: new Date().toISOString(),
  });
};

// ─── AVAILABILITY CHECK ──────────────────────────────────────────────────────

/**
 * Check if a product is available for a given date range.
 * Queries bookings to see if there's any overlap.
 * @param {string} productId
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @param {string} [excludeBookingId] - optional booking to exclude (for edits)
 * @returns {boolean}
 */
export const isProductAvailable = async (productId, startDate, endDate, excludeBookingId = null) => {
  const snap = await getDocs(
    query(
      collection(db, 'bookings'),
      where('productIds', 'array-contains', productId),
      where('status', 'in', ['confirmed', 'active'])
    )
  );

  const reqStart = new Date(startDate);
  const reqEnd = new Date(endDate);

  for (const d of snap.docs) {
    if (excludeBookingId && d.id === excludeBookingId) continue;
    const booking = d.data();
    const bookStart = new Date(booking.startDate);
    const bookEnd = new Date(booking.endDate);

    // Overlap check: two ranges overlap if start1 <= end2 AND end1 >= start2
    if (reqStart <= bookEnd && reqEnd >= bookStart) {
      return false; // Conflict found
    }
  }
  return true;
};
