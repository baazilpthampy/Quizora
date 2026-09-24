import { io, Socket } from "socket.io-client";

// Get socket server URL from VITE_API_URL or fallback to localhost:3001
const getSocketUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
  try {
    const url = new URL(apiUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "http://localhost:3001";
  }
};

export const socketUrl = getSocketUrl();

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    socketInstance = io(socketUrl, {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socketInstance;
};
