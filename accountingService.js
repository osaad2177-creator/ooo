// src/services/accountingService.js
// Income & expense tracking
// Collections: /income, /expenses

import {
  collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, where,
} from 'firebase/firestore';
import { db } from './firebase';

// ─── INCOME ──────────────────────────────────────────────────────────────────

export const addIncome = async (data) => {
  const payload = { ...data, createdAt: new Date().toISOString() };
  const ref = await addDoc(collection(db, 'income'), payload);
  return { id: ref.id, ...payload };
};

export const getAllIncome = async () => {
  const snap = await getDocs(query(collection(db, 'income'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const deleteIncome = async (id) => {
  await deleteDoc(doc(db, 'income', id));
};

// ─── EXPENSES ─────────────────────────────────────────────────────────────────

export const addExpense = async (data) => {
  const payload = { ...data, createdAt: new Date().toISOString() };
  const ref = await addDoc(collection(db, 'expenses'), payload);
  return { id: ref.id, ...payload };
};

export const getAllExpenses = async () => {
  const snap = await getDocs(query(collection(db, 'expenses'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const deleteExpense = async (id) => {
  await deleteDoc(doc(db, 'expenses', id));
};

// ─── SUMMARY ──────────────────────────────────────────────────────────────────

/**
 * Compute total revenue, expenses, and profit from arrays of records.
 */
export const computeSummary = (income = [], expenses = []) => {
  const totalRevenue = income.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  return {
    totalRevenue,
    totalExpenses,
    profit: totalRevenue - totalExpenses,
  };
};


// ─────────────────────────────────────────────────────────────────────────────
// src/services/notificationService.js
// System-wide notifications stored in Firestore
// Collection: /notifications
// ─────────────────────────────────────────────────────────────────────────────

import { collection as col2, addDoc as add2, getDocs as get2, updateDoc as upd2, doc as d2, query as q2, orderBy as ob2, where as w2 } from 'firebase/firestore';

const NOTIF_COL = 'notifications';

/**
 * Add a new notification (visible to all users).
 */
export const addNotification = async (data) => {
  const payload = {
    ...data,
    read: false,
    createdAt: new Date().toISOString(),
  };
  await add2(col2(db, NOTIF_COL), payload);
};

/**
 * Fetch all notifications, newest first.
 */
export const getAllNotifications = async () => {
  const snap = await get2(q2(col2(db, NOTIF_COL), ob2('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Mark a notification as read.
 */
export const markNotificationRead = async (id) => {
  await upd2(d2(db, NOTIF_COL, id), { read: true });
};

/**
 * Count unread notifications.
 */
export const getUnreadCount = async () => {
  const snap = await get2(q2(col2(db, NOTIF_COL), w2('read', '==', false)));
  return snap.size;
};
