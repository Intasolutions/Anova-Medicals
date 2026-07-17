import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

// Connect to the backend URL
export const socket = io(SOCKET_URL, {
    transports: ['websocket'],
    autoConnect: true,
});
