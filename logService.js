// src/services/logService.js
// Audit log — every significant action is recorded here
// Collection: /logs

import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

const COL = 'logs';

/**
 * Add an audit log entry.
 * @param {object} data - { action, entityId, entityType, description, userId, userName }
 */
export const addLog = async (data) => {
  await addDoc(collection(db, COL), {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Fetch all logs, newest first.
 */
export const getAllLogs = async () => {
  const snap = await getDocs(query(collection(db, COL), orderBy('timestamp', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};
