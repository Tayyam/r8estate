export { db, collection, doc, query, where, orderBy, limit, startAfter, getDocs, getDoc, setDoc, updateDoc, deleteDoc, addDoc, getCountFromServer, writeBatch, serverTimestamp, increment, onSnapshot, arrayRemove } from '../lib/firestoreLite';
export type { DocumentData } from '../lib/firestoreLite';
export { storage, ref, uploadBytes, getDownloadURL, deleteObject } from '../lib/storageLite';
export { httpsCallable } from '../lib/functionsLite';
export const functions = {};
export { auth, createUserWithEmailAndPassword, updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider, getAuth } from '../lib/authLite';
