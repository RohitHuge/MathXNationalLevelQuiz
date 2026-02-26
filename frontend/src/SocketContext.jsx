import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children, isAdmin = false, clientName = '' }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Configure your server URL as needed, defaulting to standard dev port
        const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

        const newSocket = io(SERVER_URL, {
            query: {
                isAdmin: isAdmin ? 'true' : 'false',
                name: clientName
            }
        });

        setSocket(newSocket);

        newSocket.on('connect', () => setIsConnected(true));
        newSocket.on('disconnect', () => setIsConnected(false));

        return () => newSocket.close();
    }, [isAdmin, clientName]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
