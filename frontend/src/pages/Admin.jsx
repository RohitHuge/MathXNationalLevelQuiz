import React, { useState, useEffect } from 'react';
import { ThemeCard } from '../components/ui/ThemeCard';
import { ThemeButton } from '../components/ui/ThemeButton';
import { useSocket } from '../SocketContext';
import { getCurrentUser } from '../lib/appwrite';
import { useNavigate } from 'react-router-dom';
import { Send, Trophy, Clock, Users, EyeOff, CheckCircle, Lock, Table2, BarChart3, Percent } from 'lucide-react';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';
import Round3Admin, { Round3HardwareCard } from '../round3/Round3Admin';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const tabClass = (active, tone) =>
  `px-3 py-2 text-center text-sm font-bold transition-all ${
    active ? `${tone} text-white border-b-2` : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
  }`;

const actionCardClass = 'relative flex h-full min-h-0 flex-col overflow-hidden p-4';
const sideUtilityCardClass = 'relative flex min-h-0 flex-col overflow-hidden p-4';

export default function Admin() {
  const { socket, isConnected } = useSocket();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timerMinutes, setTimerMinutes] = useState(90);
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeTab, setActiveTab] = useState('A');
  const [topNTeams, setTopNTeams] = useState(20);
  const [isQualifying, setIsQualifying] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isDownloadingRankings, setIsDownloadingRankings] = useState(false);
  const [isDownloadingQualifiedPublic, setIsDownloadingQualifiedPublic] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [clients, setClients] = useState([]);
  const [winnerFound, setWinnerFound] = useState(false);
  const [showProfile, setShowProfile] = useState(true);
  const [cheatAlerts, setCheatAlerts] = useState([]);
  const [pointTableState, setPointTableState] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdmin();

    if (!socket) return undefined;

    socket.on('server:results_calculated', (response) => {
      setIsCalculating(false);
      if (response.success) {
        alert('Final Results successfully calculated and saved to the database!');
      } else {
        alert(`Error calculating results: ${response.error}`);
      }
    });

    socket.on('server:cheat_alert', (data) => {
      setCheatAlerts((prev) => [data, ...prev].slice(0, 10));
    });

    socket.on('server:sync_state', (state) => {
      if (state.showProfile !== undefined) {
        setShowProfile(state.showProfile);
      }
    });
    socket.on('server:pointtable:state_update', setPointTableState);

    socket.emit('client:request_state');
    socket.emit('admin:round2:fetch_questions');
    socket.emit('admin:pointtable:request_state');

    socket.on('server:round2:questions_list', (data) => {
      setQuestions(data);
    });

    socket.on('leaderboard:update', (data) => {
      const formatted = data.answers.map((ans) => ({
        id: ans.id,
        name: ans.client.name,
        time: `${ans.timeTaken}s`,
        answer: ans.numericAnswer,
        correct: ans.isCorrect,
      }));
      setClients(formatted);
      setWinnerFound(data.winnerFound);
    });

    socket.on('server:round2:winner_found', () => {
      setWinnerFound(true);
    });

    return () => {
      socket.off('server:results_calculated');
      socket.off('server:round2:questions_list');
      socket.off('leaderboard:update');
      socket.off('server:round2:winner_found');
      socket.off('server:sync_state');
      socket.off('server:cheat_alert');
      socket.off('server:pointtable:state_update');
    };
  }, [socket]);

  const checkAdmin = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      if (currentUser.labels && currentUser.labels.includes('admin')) {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = (round, stage) => {
    if (!socket || !isConnected) return;

    let endTime = null;
    if (stage === 2 && timerMinutes > 0) {
      endTime = new Date(Date.now() + timerMinutes * 60 * 1000).toISOString();
    }
    socket.emit('admin:change_stage', { round, stage, endTime });
  };

  const handleCalculateResults = () => {
    if (!window.confirm('Are you sure you want to calculate final results? This will overwrite the current individual and team scores based on the latest responses.')) {
      return;
    }
    setIsCalculating(true);
    socket.emit('admin:calculate_results');
  };

  const handleQualifyTeams = async () => {
    if (!window.confirm(`Are you sure you want to grant Round 2 Access to the Top ${topNTeams} Teams?`)) return;
    setIsQualifying(true);
    try {
      const res = await fetch('/api/round2/qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ n: parseInt(topNTeams, 10) }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        if (data.qualifiedTeams && data.qualifiedTeams.length > 0) {
          generateQualifiedTeamsPDF(data.qualifiedTeams);
        }
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to connect to qualification server.');
    } finally {
      setIsQualifying(false);
    }
  };

  const generateQualifiedTeamsPDF = (qualifiedTeams) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Qualified Team Leaders - Round 1 to Round 2', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    const tableColumn = ['#', 'Team Name', 'Leader Name', 'Email ID', 'Total Score'];
    const tableRows = qualifiedTeams.map((team, index) => ([
      index + 1,
      team.team_name,
      team.full_name,
      team.email,
      team.total_score || 0,
    ]));

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'striped',
      headStyles: { fillColor: [188, 19, 254] },
      styles: { fontSize: 9 },
    });

    doc.save(`Qualified_Teams_Round2_${new Date().getTime()}.pdf`);
  };

  const generateRankedTeamsPDF = (rankedTeams) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('All Teams Ranking - Round 1', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    const tableColumn = ['Rank', 'Team Name', 'Total Score'];
    const tableRows = rankedTeams.map((team) => ([
      team.rank,
      team.team_name,
      team.total_score || 0,
    ]));

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
      styles: { fontSize: 9 },
    });

    doc.save(`All_Teams_Ranking_${new Date().getTime()}.pdf`);
  };

  const generatePublicQualifiedTeamsPDF = (qualifiedTeams) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Qualified Teams - Public List', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    const tableColumn = ['Rank', 'Team Name', 'Total Score'];
    const tableRows = qualifiedTeams.map((team) => ([
      team.rank,
      team.team_name,
      team.total_score || 0,
    ]));

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });

    doc.save(`Qualified_Teams_Public_${new Date().getTime()}.pdf`);
  };

  const fetchRound2Reports = async () => {
    const res = await fetch(`/api/round2/reports?n=${parseInt(topNTeams, 10) || 20}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch Round 2 reports.');
    }

    return data;
  };

  const handleDownloadRankings = async () => {
    setIsDownloadingRankings(true);
    try {
      const data = await fetchRound2Reports();
      generateRankedTeamsPDF(data.rankedTeams || []);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Failed to download ranked teams list.');
    } finally {
      setIsDownloadingRankings(false);
    }
  };

  const handleDownloadQualifiedPublic = async () => {
    setIsDownloadingQualifiedPublic(true);
    try {
      const data = await fetchRound2Reports();
      generatePublicQualifiedTeamsPDF(data.qualifiedTeams || []);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Failed to download qualified teams public list.');
    } finally {
      setIsDownloadingQualifiedPublic(false);
    }
  };

  const handleRevokeAll = async () => {
    if (!window.confirm('WARNING: Are you sure you want to REVOKE Round 2 Access from ALL users?')) return;
    setIsRevoking(true);
    try {
      const res = await fetch('/api/round2/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) alert(data.message);
      else alert(`Error: ${data.error}`);
    } catch (error) {
      console.error(error);
      alert('Failed to connect to revocation server.');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleSendQuestion = (id) => {
    if (!socket) return;
    socket.emit('admin:round2:push_question', { id });
    setActiveQuestionId(id);
  };

  const handleHideQuestion = () => {
    if (!socket) return;
    socket.emit('admin:round2:hide_question');
    setActiveQuestionId(null);
    setClients([]);
    setWinnerFound(false);
  };

  const handleVisibilityToggle = () => {
    if (!socket || !isConnected) return;
    socket.emit('admin:toggle_profile_visibility', { showProfile: !showProfile });
  };

  const handlePointTableDisplay = (mode) => {
    if (!socket || !isConnected) return;
    socket.emit('admin:pointtable:set_display_mode', { mode });
    socket.emit('admin:change_stage', { round: 'P', stage: 1 });
  };

  const emergencyResetCard = (
    <ThemeCard className={`${activeTab === 'C' ? sideUtilityCardClass : actionCardClass} border-blue-500/20 hover:border-blue-500/50`}>
      <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="relative z-10 flex w-full items-center justify-between gap-3">
        <h3 className="text-sm font-black text-white">Emergency Reset</h3>
        <ThemeButton variant="secondary" className="shrink-0 border-blue-500/30 px-3 py-2 text-sm text-blue-400 hover:bg-blue-500/10 hover:text-blue-300" onClick={() => handleStageChange('A', 0)} disabled={!isConnected}>
          Return All
        </ThemeButton>
      </div>
    </ThemeCard>
  );

  const profileVisibilityCard = (
    <ThemeCard className={`${activeTab === 'C' ? sideUtilityCardClass : actionCardClass} border-purple-500/20 hover:border-purple-500/50`}>
      <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-purple-500/10 blur-2xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="relative z-10 flex w-full items-center justify-between gap-3">
        <h3 className="text-sm font-black text-white">Profile Visibility</h3>
        <ThemeButton variant={showProfile ? 'primary' : 'secondary'} className={`flex shrink-0 items-center gap-2 px-3 py-2 text-sm ${showProfile ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-red-500/20 border-red-500/50 text-red-400'}`} onClick={handleVisibilityToggle} disabled={!isConnected}>
          {showProfile ? <CheckCircle size={16} /> : <EyeOff size={16} />}
          {showProfile ? 'Showing' : 'Hidden'}
        </ThemeButton>
      </div>
    </ThemeCard>
  );

  const pointTableCard = (
    <ThemeCard className={`${activeTab === 'C' ? sideUtilityCardClass : actionCardClass} border-cyan-500/20 hover:border-cyan-500/50 ${activeTab === 'C' ? '' : 'xl:col-span-2'}`}>
      <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex-1">
          <h3 className="mb-1 text-base font-black text-white">Point Table Broadcast</h3>
          <p className="text-xs text-[var(--color-gray-400)]">
            Manage team scores in `/pointtable` and push the public screen to the table or graphs.
          </p>
          {pointTableState && (
            <div className="mt-3 inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">
              Current View: {pointTableState.displayMode}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <ThemeButton
            variant="secondary"
            className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
            onClick={() => navigate('/pointtable')}
          >
            Manage Point Table
          </ThemeButton>
          <ThemeButton
            variant="secondary"
            className="flex items-center gap-2 border-white/20 text-white hover:bg-white/10"
            onClick={() => handlePointTableDisplay('table')}
            disabled={!isConnected}
          >
            <Table2 size={16} />
            Table
          </ThemeButton>
          <ThemeButton
            variant="secondary"
            className="flex items-center gap-2 border-white/20 text-white hover:bg-white/10"
            onClick={() => handlePointTableDisplay('scoreGraph')}
            disabled={!isConnected}
          >
            <BarChart3 size={16} />
            Score Graph
          </ThemeButton>
          <ThemeButton
            variant="secondary"
            className="flex items-center gap-2 border-white/20 text-white hover:bg-white/10"
            onClick={() => handlePointTableDisplay('accuracyGraph')}
            disabled={!isConnected}
          >
            <Percent size={16} />
            Accuracy Graph
          </ThemeButton>
        </div>
      </div>
    </ThemeCard>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="w-8 h-8 border-4 border-[var(--color-neon-cyan)]/30 border-t-[var(--color-neon-cyan)] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto mt-10 p-4">
        <ThemeCard className="border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/10 rounded-lg shrink-0">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-red-500 mb-1">Access Restricted</h3>
              <p className="text-[var(--color-gray-300)] font-medium leading-relaxed">
                You do not have the necessary administrator privileges to access this controller panel.
              </p>
              <ThemeButton variant="secondary" className="mt-4" onClick={() => navigate('/dashboard')}>
                Return to Dashboard
              </ThemeButton>
            </div>
          </div>
        </ThemeCard>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-5.75rem)] w-full max-w-[1600px] flex-col gap-3 overflow-hidden px-1 md:px-2">
      <div className="flex justify-end border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2 rounded-full border border-[var(--color-neon-cyan)]/20 bg-black/40 px-3 py-1.5 shadow-[0_0_15px_rgba(0,255,255,0.1)]">
          <div className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-xs font-bold tracking-[0.24em] text-[var(--color-gray-200)]">{isConnected ? 'LIVE SYNC' : 'OFFLINE'}</span>
        </div>
      </div>

      {winnerFound && activeTab === 'B' && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-green-500/50 bg-green-500/10 px-3 py-2 animate-pulse">
          <CheckCircle className="text-green-500" size={18} />
          <h2 className="text-sm font-black uppercase tracking-wide text-green-400">Winner found. Round 2 is locked.</h2>
        </div>
      )}

      <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-gray-800 bg-black/40">
        <button onClick={() => setActiveTab('A')} className={tabClass(activeTab === 'A', 'bg-[var(--color-neon-purple)]/20 border-[var(--color-neon-purple)]')}>Round 1</button>
        <button onClick={() => setActiveTab('B')} className={tabClass(activeTab === 'B', 'bg-[var(--color-neon-cyan)]/20 border-[var(--color-neon-cyan)]')}>Round 2</button>
        <button onClick={() => setActiveTab('C')} className={tabClass(activeTab === 'C', 'bg-[var(--color-neon-purple)]/20 border-[var(--color-neon-purple)]')}>Round 3</button>
      </div>

      {cheatAlerts.length > 0 && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3">
          <div className="mb-2 flex items-center justify-between border-b border-red-500/20 pb-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-red-500">
              <Lock size={16} />
              Live Anti-Cheat
            </h3>
            <button onClick={() => setCheatAlerts([])} className="text-[10px] font-bold uppercase tracking-widest text-red-500/50 hover:text-red-500">
              Clear All
            </button>
          </div>
          <div className="custom-scrollbar max-h-24 space-y-2 overflow-y-auto pr-1">
            {cheatAlerts.map((alert, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-500/10 bg-black/40 px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-sm font-black text-white">{alert.teamName}</span>
                  <span className="text-xs text-red-400/80">violation: {alert.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-red-500">Warning #{alert.warningCount}</span>
                  <span className="text-xs font-mono text-gray-500">{alert.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab !== 'C' && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {emergencyResetCard}
          {profileVisibilityCard}
        </div>
      )}

      {activeTab === 'A' ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-12">
          <ThemeCard className={`${actionCardClass} border-[var(--color-neon-purple)]/20 hover:border-[var(--color-neon-purple)]/50 lg:col-span-3`}>
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[var(--color-neon-purple)]/10 blur-2xl -translate-y-1/2 translate-x-1/2"></div>
            <h3 className="relative z-10 mb-2 text-lg font-black text-white">1. Pre-Flight</h3>
            <p className="relative z-10 mb-3 flex-grow text-sm text-[var(--color-gray-400)]">Move dashboard users into the waiting room.</p>
            <ThemeButton variant="primary" className="w-full bg-[var(--color-neon-purple)]/20 px-4 py-2 text-sm border-[var(--color-neon-purple)]/50 text-white hover:bg-[var(--color-neon-purple)]" onClick={() => handleStageChange('A', 1)} disabled={!isConnected}>
              Push to Waiting Room
            </ThemeButton>
          </ThemeCard>

          <ThemeCard className={`${actionCardClass} border-[var(--color-neon-cyan)]/20 hover:border-[var(--color-neon-cyan)]/50 lg:col-span-4`}>
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[var(--color-neon-cyan)]/10 blur-2xl -translate-y-1/2 translate-x-1/2"></div>
            <h3 className="relative z-10 mb-2 text-lg font-black text-white">2. Launch Quiz</h3>
            <p className="relative z-10 mb-3 text-sm text-[var(--color-gray-400)]">Start the Round 1 arena with a synced countdown.</p>
            <div className="relative z-10 mb-3 rounded-xl border border-[var(--color-neon-cyan)]/10 bg-black/40 p-3">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--color-neon-cyan)]">Quiz Duration</label>
              <div className="flex flex-col gap-2">
                <input type="number" value={timerMinutes} onChange={(e) => setTimerMinutes(parseInt(e.target.value, 10) || 0)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-base font-mono text-white focus:outline-none focus:border-[var(--color-neon-cyan)]" min="1" />
                <div className="grid grid-cols-5 gap-2">
                  {[1, 15, 30, 60, 90].map((mins) => (
                    <button key={mins} onClick={() => setTimerMinutes(mins)} className={`rounded py-1.5 text-xs font-bold transition-colors ${timerMinutes === mins ? 'bg-[var(--color-neon-cyan)] text-slate-900 shadow-[0_0_10px_rgba(0,255,255,0.3)]' : 'bg-slate-800 text-[var(--color-neon-cyan)] hover:bg-slate-700'}`}>
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <ThemeButton variant="primary" className="mt-auto w-full px-4 py-2 text-sm" onClick={() => handleStageChange('A', 2)} disabled={!isConnected}>
              Commence Simulation
            </ThemeButton>
          </ThemeCard>

          <ThemeCard className={`${actionCardClass} border-green-500/20 hover:border-green-500/50 lg:col-span-2`}>
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-green-500/10 blur-2xl -translate-y-1/2 translate-x-1/2"></div>
            <h3 className="relative z-10 mb-2 text-lg font-black text-white">3. Final Results</h3>
            <p className="relative z-10 mb-3 flex-grow text-sm text-[var(--color-gray-400)]">Calculate the latest individual and team totals.</p>
            <ThemeButton variant="primary" className={`w-full px-4 py-2 text-sm ${isCalculating ? 'bg-green-600 cursor-not-allowed' : 'bg-green-600/20 border-green-500/50 text-white hover:bg-green-600'}`} onClick={handleCalculateResults} disabled={!isConnected || isCalculating}>
              {isCalculating ? 'Calculating...' : 'Calculate Results'}
            </ThemeButton>
          </ThemeCard>

          <ThemeCard className={`${actionCardClass} border-amber-500/20 hover:border-amber-500/50 lg:col-span-3`}>
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl translate-y-1/2 -translate-x-1/4"></div>
            <h3 className="relative z-10 mb-2 text-lg font-black text-white">R2 Access</h3>
            <p className="relative z-10 mb-3 text-sm text-[var(--color-gray-400)]">Grant or revoke Round 2 eligibility without leaving this page.</p>
            <div className="relative z-10 grid flex-1 grid-cols-1 gap-3">
              <div className="flex flex-col rounded-xl border border-amber-500/20 bg-black/40 p-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-amber-400">Qualify Top Teams</label>
                <div className="mb-3 flex gap-3">
                  <input type="number" value={topNTeams} onChange={(e) => setTopNTeams(e.target.value)} className="w-20 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-center font-mono text-base text-white focus:outline-none focus:border-amber-500" min="1" />
                  <div className="flex flex-1 items-center text-xs leading-tight text-[var(--color-gray-400)]">
                    Number of top teams to unlock for Round 2.
                  </div>
                </div>
                <ThemeButton variant="primary" className={`mt-auto w-full px-4 py-2 text-sm ${isQualifying ? 'bg-amber-600 cursor-not-allowed' : 'bg-amber-600/20 border-amber-500/50 text-white hover:bg-amber-600'}`} onClick={handleQualifyTeams} disabled={isQualifying}>
                  {isQualifying ? 'Processing...' : `Qualify Top ${topNTeams}`}
                </ThemeButton>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <ThemeButton
                    variant="secondary"
                    className={`w-full px-4 py-2 text-sm ${isDownloadingRankings ? 'bg-green-900 cursor-not-allowed text-white' : 'border-green-500/50 text-green-400 hover:bg-green-500 hover:text-white'}`}
                    onClick={handleDownloadRankings}
                    disabled={isDownloadingRankings}
                  >
                    {isDownloadingRankings ? 'Preparing Rankings...' : 'Download All Teams Ranking'}
                  </ThemeButton>
                  <ThemeButton
                    variant="secondary"
                    className={`w-full px-4 py-2 text-sm ${isDownloadingQualifiedPublic ? 'bg-blue-900 cursor-not-allowed text-white' : 'border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white'}`}
                    onClick={handleDownloadQualifiedPublic}
                    disabled={isDownloadingQualifiedPublic}
                  >
                    {isDownloadingQualifiedPublic ? 'Preparing Public List...' : `Download Qualified Top ${topNTeams} Public List`}
                  </ThemeButton>
                </div>
              </div>

              <div className="flex flex-col rounded-xl border border-red-500/20 bg-black/40 p-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-red-400">Emergency Revoke</label>
                <p className="mb-3 text-sm text-[var(--color-gray-400)]">Remove the <code>round2</code> label from all users.</p>
                <ThemeButton variant="secondary" className={`mt-auto w-full px-4 py-2 text-sm ${isRevoking ? 'bg-red-900 cursor-not-allowed text-white' : 'border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white'}`} onClick={handleRevokeAll} disabled={isRevoking}>
                  {isRevoking ? 'Revoking...' : 'Revoke All'}
                </ThemeButton>
              </div>
            </div>
          </ThemeCard>
        </div>
      ) : activeTab === 'B' ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <ThemeCard className="border-[var(--color-neon-purple)]/20 p-4 shadow-[0_0_15px_rgba(188,19,254,0.05)]">
            <div className="flex flex-col items-center justify-between gap-3 md:flex-row">
              <div className="flex-1 text-center md:text-left">
                <h2 className="mb-1 flex items-center justify-center gap-2 text-lg font-bold text-white md:justify-start">
                  <Users className="text-[var(--color-neon-purple)]" size={18} />
                  Round 2 Stage Manager
                </h2>
                <p className="text-xs text-[var(--color-gray-400)]">Manage the flow between the hub and live arena.</p>
              </div>
              <div className="flex w-full flex-wrap justify-center gap-2 md:w-auto md:justify-end">
                <ThemeButton variant="primary" className="flex-1 bg-[var(--color-neon-purple)]/20 px-4 py-2 text-sm border-[var(--color-neon-purple)]/50 text-white hover:bg-[var(--color-neon-purple)] md:flex-none" onClick={() => handleStageChange('B', 1)} disabled={!isConnected}>
                  Push to Hub
                </ThemeButton>
                <ThemeButton variant="primary" className="flex-1 bg-[var(--color-neon-cyan)]/20 px-4 py-2 text-sm border-[var(--color-neon-cyan)]/50 text-white hover:bg-[var(--color-neon-cyan)] md:flex-none" onClick={() => handleStageChange('B', 2)} disabled={!isConnected}>
                  Launch Arena
                </ThemeButton>
              </div>
            </div>
          </ThemeCard>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-12">
            <div className="min-h-0 xl:col-span-7">
              <ThemeCard className="flex h-full min-h-[22rem] flex-col overflow-hidden border-[var(--color-neon-cyan)]/20 p-4 shadow-[0_0_15px_rgba(0,255,255,0.05)] xl:min-h-0">
                <div className="mb-3 flex items-center justify-between border-b border-gray-800 pb-3">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <Send className="text-[var(--color-neon-cyan)]" size={18} />
                    Question Preview & Control
                  </h2>
                  {activeQuestionId && (
                    <button onClick={handleHideQuestion} className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-500 hover:bg-amber-500/20">
                      <EyeOff size={14} />
                      Hide
                    </button>
                  )}
                </div>
                <div className="custom-scrollbar flex-1 min-h-0 max-h-full space-y-3 overflow-y-auto pr-2">
                  {questions.length === 0 ? (
                    <p className="py-10 text-center text-sm text-gray-500">No FastFingers questions found.</p>
                  ) : (
                    questions.map((q, idx) => (
                      <div key={q.id} className={`rounded-xl border p-4 transition-all ${activeQuestionId === q.id ? 'bg-[var(--color-neon-cyan)]/10 border-[var(--color-neon-cyan)] shadow-[0_0_20px_rgba(0,255,255,0.15)] ring-1 ring-[var(--color-neon-cyan)]/50' : 'bg-black/40 border-gray-800 hover:border-[var(--color-neon-cyan)]/40'}`}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="text-base font-black text-gray-300">Question {idx + 1}</span>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full border border-[var(--color-neon-cyan)]/30 bg-black px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-neon-cyan)]">
                              {q.marks || 10} Points
                            </span>
                            <ThemeButton variant={activeQuestionId === q.id ? 'primary' : 'secondary'} className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest ${activeQuestionId === q.id ? 'bg-[var(--color-neon-cyan)]/30 border-[var(--color-neon-cyan)] text-white' : 'border-gray-600 text-gray-300 hover:border-[var(--color-neon-cyan)]'}`} onClick={() => handleSendQuestion(q.id)} disabled={activeQuestionId && activeQuestionId !== q.id}>
                              {activeQuestionId === q.id ? 'Live' : 'Push'}
                            </ThemeButton>
                          </div>
                        </div>
                        <div className="rounded-xl border border-gray-800/50 bg-brand-dark/20 p-3 text-sm font-medium leading-relaxed text-gray-200">
                          <p className="mb-3 font-sans tracking-wide text-gray-400">{q.content?.text}</p>
                          {q.content?.mathText && (
                            <div className="inline-block max-w-full overflow-x-auto rounded-lg border border-[var(--color-neon-cyan)]/20 bg-black/60 p-3 text-base text-[var(--color-neon-cyan)]">
                              <Latex>{q.content.mathText}</Latex>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ThemeCard>
            </div>

            <div className="min-h-0 xl:col-span-5 flex flex-col">
              <ThemeCard className="flex h-full min-h-[20rem] flex-col border-[var(--color-neon-purple)]/20 p-4 shadow-[0_0_15px_rgba(188,19,254,0.05)] xl:min-h-0">
                <h2 className="mb-3 flex items-center justify-between border-b border-gray-800 pb-3 text-lg font-bold text-white">
                  <div className="flex items-center gap-2">
                    <Trophy className="text-[var(--color-neon-purple)]" size={18} />
                    <span>Live Feed & Responses</span>
                  </div>
                  <span className="rounded-full border border-[var(--color-neon-purple)]/30 bg-[var(--color-neon-purple)]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-neon-purple)]">
                    Real-time
                  </span>
                </h2>
                <div className="custom-scrollbar flex-1 min-h-0 max-h-full space-y-3 overflow-y-auto pr-2">
                  {clients.length === 0 ? (
                    <div className="py-16 text-center text-sm font-medium text-gray-500">Awaiting participant attempts...</div>
                  ) : (
                    clients.map((client, idx) => (
                      <div key={`${client.id}-${idx}`} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${client.correct ? 'bg-[var(--color-neon-cyan)]/20 border-[var(--color-neon-cyan)] shadow-[0_0_20px_rgba(0,255,255,0.2)]' : 'bg-red-500/5 border-red-500/20'}`}>
                        <div className="flex items-center gap-3">
                          <span className={`text-xl font-black ${client.correct ? 'text-[var(--color-neon-cyan)]' : 'text-gray-600'}`}>#{idx + 1}</span>
                          <span className={`font-bold ${client.correct ? 'text-white' : 'text-gray-300'}`}>{client.name}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="text-right">
                            <p className="mb-1 text-[10px] uppercase tracking-widest text-gray-500">Guessed</p>
                            <p className={`font-mono text-lg font-black ${client.correct ? 'text-white' : 'text-red-400'}`}>{client.answer}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${client.correct ? 'bg-green-500/20 text-green-400' : 'bg-red-500/10 text-red-500'}`}>
                            {client.correct ? 'CORRECT' : 'INCORRECT'}
                          </span>
                          <div className={`flex w-20 items-center justify-end gap-1.5 font-mono text-sm ${client.correct ? 'text-[var(--color-neon-cyan)]' : 'text-gray-500'}`}>
                            <Clock size={14} />
                            {client.time}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ThemeCard>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-12">
          <div className="min-h-0 xl:col-span-9 flex flex-col gap-3 overflow-hidden">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {emergencyResetCard}
              {profileVisibilityCard}
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <Round3Admin />
            </div>
          </div>
          <div className="min-h-0 xl:col-span-3 flex flex-col gap-3">
            {pointTableCard}
            <Round3HardwareCard />
          </div>
        </div>
      )}
    </div>
  );
}
