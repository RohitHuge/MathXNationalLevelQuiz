import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeCard } from '../components/ui/ThemeCard';
import { ThemeButton } from '../components/ui/ThemeButton';

export default function RegisterTesting() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ fullName: '', email: '', collegeName: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
            const response = await fetch(`${SERVER_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            // Save the returned PostgreSQL UUID to use in Quiz submissions
            localStorage.setItem('mathx_postgres_user_id', data.sqlUser.id);
            localStorage.setItem('mathx_postgres_user_name', data.sqlUser.full_name);

            // Successfully seeded, push them to dashboard
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <ThemeCard className="w-full max-w-md p-8 border-cyan-500/20 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold text-white mb-2">Participant Registration</h2>
                    <p className="text-[var(--color-gray-400)]">Testing Module - Anchors to PostgreSQL</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-gray-300)] mb-1">Full Name</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--color-gray-300)] mb-1">Email Address</label>
                        <input
                            type="email"
                            required
                            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--color-gray-300)] mb-1">Password</label>
                        <input
                            type="password"
                            required
                            minLength={8}
                            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--color-gray-300)] mb-1">College Name (Optional)</label>
                        <input
                            type="text"
                            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                            value={formData.collegeName}
                            onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                        />
                    </div>

                    <ThemeButton
                        type="submit"
                        variant="primary"
                        className="w-full mt-8"
                        disabled={loading}
                    >
                        {loading ? 'Registering...' : 'Register Test Subject'}
                    </ThemeButton>
                </form>
            </ThemeCard>
        </div>
    );
}
