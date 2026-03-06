import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

// eslint-disable-next-line react/prop-types
export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [gameState, setGameState] = useState(null);
    const [timer, setTimer] = useState(60);
    const [allQuestions, setAllQuestions] = useState([]);

    useEffect(() => {
        const newSocket = io('http://localhost:3001');
        setSocket(newSocket);

        newSocket.on('gameStateUpdate', (state) => {
            setGameState(state);
            setTimer(state.timerTime);
        });

        newSocket.on('timerUpdate', (time) => {
            setTimer(time);
        });

        newSocket.on('allQuestions', (qs) => {
            setAllQuestions(qs);
        });

        return () => newSocket.close();
    }, []);

    return (
        <SocketContext.Provider value={{ socket, gameState, timer, allQuestions }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};
