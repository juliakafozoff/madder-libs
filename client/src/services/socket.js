import { io } from "socket.io-client";

let socket = null;

export function getSocket() {
  if (socket && socket.connected) return socket;

  // If socket exists but is disconnected, clean it up
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5001";
  const token = localStorage.getItem("userToken");

  socket = io(apiUrl, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    auth: token ? { token } : {},
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
