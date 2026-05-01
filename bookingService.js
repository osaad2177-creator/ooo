// src/services/bookingService.js
// Firestore CRUD for the Bookings module
// Collection: /bookings

import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, where, orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { isProductAvailable, updateProductStatus, PRODUCT_STATUS } from './inventoryService';
import { addLog } from './logService';
import { addNotification } from './notificationService';

const COL = 'bookings';

// ─── BOOKING STATUS ──────────────────────────────────────────────────────────
export const BOOKING_STATUS = {
  confirmed: 'confirmed',
  active: 'active',
  completed: 'completed',
  cancelled: 'cancelled',
};

// ─── READ ─────────────────────────────────────────────────────────────────────

export const getAllBookings = async () => {
  const snap = await getDocs(query(collection(db, COL), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getBooking = async (id) => {
  const docSnap = await getDoc(doc(db, COL, id));
  if (!docSnap.exists()) throw new Error('Booking not found');
  return { id: docSnap.id, ...docSnap.data() };
};

export const getBookingsByStatus = async (status) => {
  const snap = await getDocs(
    query(collection(db, COL), where('status', '==', status), orderBy('startDate', 'asc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ─── CREATE BOOKING ───────────────────────────────────────────────────────────

/**
 * Create a new booking.
 * Checks for conflicts first; throws if any product is unavailable.
 * @param {object} data - { clientName, clientEmail, productIds, productNames, startDate, endDate, totalAmount, notes }
 * @param {object} currentUser
 */
export const createBooking = async (data, currentUser) => {
  // 1. Validate availability for all selected products
  const conflicts = [];
  for (const productId of data.productIds) {
    const available = await isProductAvailable(productId, data.startDate, data.endDate);
    if (!available) {
      const name = data.productNames?.[productId] || productId;
      conflicts.push(name);
    }
  }

  if (conflicts.length > 0) {
    throw new Error(`Conflict: The following items are already booked for this period: ${conflicts.join(', ')}`);
  }

  // 2. Create booking document
  const payload = {
    ...data,
    status: BOOKING_STATUS.confirmed,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: currentUser.uid,
    createdByName: currentUser.displayName,
  };

  const ref = await addDoc(collection(db, COL), payload);

  // 3. Update product statuses to "rented"
  for (const productId of data.productIds) {
    await updateProductStatus(productId, PRODUCT_STATUS.rented);
  }

  // 4. Add audit log
  await addLog({
    action: 'booking_created',
    entityId: ref.id,
    entityType: 'booking',
    description: `Booking created for "${data.clientName}"`,
    userId: currentUser.uid,
    userName: currentUser.displayName,
  });

  // 5. Send notification to all users
  await addNotification({
    type: 'booking_created',
    title: 'New Booking Created',
    message: `A new booking for ${data.clientName} has been created (${data.startDate} → ${data.endDate}).`,
    bookingId: ref.id,
    createdBy: currentUser.displayName,
  });

  return { id: ref.id, ...payload };
};

// ─── UPDATE BOOKING ───────────────────────────────────────────────────────────

/**
 * Update a booking's details (not status).
 * Re-validates availability excluding this booking.
 */
export const updateBooking = async (id, data, currentUser) => {
  // Re-check availability excluding this booking
  for (const productId of data.productIds) {
    const available = await isProductAvailable(productId, data.startDate, data.endDate, id);
    if (!available) {
      const name = data.productNames?.[productId] || productId;
      throw new Error(`Conflict: "${name}" is already booked for this period.`);
    }
  }

  const payload = { ...data, updatedAt: new Date().toISOString() };
  await updateDoc(doc(db, COL, id), payload);

  await addLog({
    action: 'booking_updated',
    entityId: id,
    entityType: 'booking',
    description: `Booking for "${data.clientName}" updated`,
    userId: currentUser.uid,
    userName: currentUser.displayName,
  });
};

// ─── CHANGE BOOKING STATUS ────────────────────────────────────────────────────

/**
 * Change the status of a booking (confirm → active → completed / cancelled).
 * When completed or cancelled, frees up the products.
 */
export const changeBookingStatus = async (id, status, currentUser) => {
  const booking = await getBooking(id);
  await updateDoc(doc(db, COL, id), { status, updatedAt: new Date().toISOString() });

  // Free products when booking ends
  if (status === BOOKING_STATUS.completed || status === BOOKING_STATUS.cancelled) {
    for (const productId of booking.productIds) {
      await updateProductStatus(productId, PRODUCT_STATUS.available);
    }
  }

  await addLog({
    action: 'booking_status_changed',
    entityId: id,
    entityType: 'booking',
    description: `Booking "${id}" status changed to "${status}"`,
    userId: currentUser.uid,
    userName: currentUser.displayName,
  });

  await addNotification({
    type: 'booking_status',
    title: 'Booking Status Updated',
    message: `Booking for ${booking.clientName} is now ${status}.`,
    bookingId: id,
    createdBy: currentUser.displayName,
  });
};

// ─── DELETE BOOKING ───────────────────────────────────────────────────────────

export const deleteBooking = async (id, currentUser) => {
  const booking = await getBooking(id);

  // Free up products
  for (const productId of booking.productIds) {
    await updateProductStatus(productId, PRODUCT_STATUS.available);
  }

  await deleteDoc(doc(db, COL, id));

  await addLog({
    action: 'booking_deleted',
    entityId: id,
    entityType: 'booking',
    description: `Booking for "${booking.clientName}" deleted`,
    userId: currentUser.uid,
    userName: currentUser.displayName,
  });
};
