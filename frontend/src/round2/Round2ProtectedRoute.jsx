import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUser } from '../lib/appwrite';
import { ThemeCard } from '../components/ui/ThemeCard';
import { ThemeButton } from '../components/ui/ThemeButton';
import { useNavigate } from 'react-router-dom';

const Round2ProtectedRoute = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAccess = async () => {
            try {
                const session = await getCurrentUser();
                setUser(session);
            } catch (error) {
                console.error("Authentication check failed", error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkAccess();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--color-slate-900)] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[var(--color-neon-purple)]/30 border-t-[var(--color-neon-purple)] rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    // Check for Round 2 Access Label
    if (!user.labels || !user.labels.includes('round2')) {
        return (
            <div className="min-h-screen bg-[var(--color-slate-900)] flex items-center justify-center p-4 selection:bg-[var(--color-neon-purple)] selection:text-white">
                <ThemeCard className="max-w-md w-full border-red-500/30 bg-red-500/5 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-red-500/10 rounded-full">
                            <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h2>
                    <p className="text-[var(--color-gray-300)] mb-8">
                        Your team has not qualified for Round 2 of the MathX CBT. Only the top performing teams from Round 1 are granted access to this stage.
                    </p>
                    <ThemeButton
                        variant="secondary"
                        className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        onClick={() => navigate('/dashboard')}
                    >
                        Return to Hub
                    </ThemeButton>
                </ThemeCard>
            </div>
        );
    }

    return children;
};

export default Round2ProtectedRoute;
