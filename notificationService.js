// src/services/notificationService.js
import {
  collection, addDoc, getDocs, updateDoc, doc, query, orderBy, where,
} from 'firebase/firestore';
import { db } from './firebase';

const COL = 'notifications';

export const addNotification = async (data) => {
  const payload = { ...data, read: false, createdAt: new Date().toISOString() };
  await addDoc(collection(db, COL), payload);
};

export const getAllNotifications = async () => {
  const snap = await getDocs(query(collection(db, COL), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const markNotificationRead = async (id) => {
  await updateDoc(doc(db, COL, id), { read: true });
};

export const markAllRead = async (ids) => {
  await Promise.all(ids.map((id) => updateDoc(doc(db, COL, id), { read: true })));
};
