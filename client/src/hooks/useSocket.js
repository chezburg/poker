import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "";

let socketInstance = null;

function getSocket() {
  if (!socketInstance) {
    socketInstance = io(SERVER_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
}

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const socket = useRef(getSocket());

  useEffect(() => {
    const s = socket.current;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    if (s.connected) setConnected(true);
    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
    };
  }, []);

  const emit = useCallback((event, data) => {
    socket.current.emit(event, data);
  }, []);

  const on = useCallback((event, handler) => {
    socket.current.on(event, handler);
    return () => socket.current.off(event, handler);
  }, []);

  return { socket: socket.current, connected, emit, on };
}
