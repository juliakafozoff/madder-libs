import {
  onAuthStateChanged,
  signInAnonymously,
  linkWithCredential,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "./firebase";

export function getAuthToken() {
  if (!auth || !auth.currentUser) return Promise.resolve(null);
  return auth.currentUser.getIdToken();
}

export function getCurrentUser() {
  if (!auth || !auth.currentUser) return null;
  const u = auth.currentUser;
  return {
    uid: u.uid,
    isAnonymous: u.isAnonymous,
    phoneNumber: u.phoneNumber,
    displayName: u.displayName,
  };
}

export async function linkAccount(credential) {
  if (!auth || !auth.currentUser) throw new Error("No current user");
  return linkWithCredential(auth.currentUser, credential);
}

export async function initAnonymousSession() {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (err) {
    console.error("Anonymous sign-in failed:", err);
    return null;
  }
}

export function onAuthChange(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function signOut() {
  localStorage.removeItem("userToken");
  if (auth) {
    await firebaseSignOut(auth);
  }
}
