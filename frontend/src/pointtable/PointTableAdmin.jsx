import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Eye, Percent, Plus, RotateCcw, Table2, Trophy, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../SocketContext';
import { getCurrentUser } from '../lib/appwrite';
import {
  getTeamAccuracy,
  getTeamCorrectCount,
  getTeamIncorrectCount,
  getTeamTotalScore,
  sortTeamsByScore,
} from './pointTableUtils';

const displayModes = [
  { key: 'table', label: 'Points Table', icon: Table2 },
  { key: 'scoreGraph', label: 'Score Graph', icon: BarChart3 },
  { key: 'accuracyGraph', label: 'Accuracy Graph', icon: Percent },
];

export default function PointTableAdmin() {
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const currentUser = await getCurrentUser();
        setIsAdmin(Boolean(currentUser.labels?.includes('admin')));
      } catch (error) {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, []);

  useEffect(() => {
    if (!socket) return undefined;

    socket.on('server:pointtable:state_update', setState);
    socket.emit('admin:pointtable:request_state');

    return () => {
      socket.off('server:pointtable:state_update');
    };
  }, [socket]);

  const rankedTeams = useMemo(() => {
    if (!state) return [];
    return sortTeamsByScore(state.teams || [], state.rounds || []);
  }, [state]);

  const showPublicView = (mode) => {
    if (!socket) return;
    socket.emit('admin:pointtable:set_display_mode', { mode });
    socket.emit('admin:change_stage', { round: 'P', stage: 1 });
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-400"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center p-6">
        <div className="rounded-[2rem] border border-red-500/30 bg-red-500/10 p-6 text-white">
          <h2 className="text-2xl font-black text-red-400">Access Restricted</h2>
          <p className="mt-2 text-white/70">Only admins can manage the point table.</p>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center text-xl font-bold text-white/60">
        Loading point table state...
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-0 w-full flex-col gap-3 overflow-hidden bg-[var(--color-slate-900)] px-2 py-2 text-white">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3 rounded-[1.75rem] border border-white/10 bg-black/40 p-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">
            <Trophy size={16} />
            Point Table Control
          </div>
          <h1 className="text-2xl font-black">{state.title}</h1>
          <p className="mt-1 text-sm text-white/50">Round 3 sub-round scoring, team names, and public graph mode.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/75 hover:bg-white/10"
          >
            Main Admin
          </button>
          <button
            onClick={() => socket.emit('admin:pointtable:reset')}
            className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/20"
          >
            <RotateCcw size={16} />
            Reset Table
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-12">
        <section className="xl:col-span-3 flex min-h-0 flex-col gap-3 overflow-hidden">
          <div className="rounded-[1.75rem] border border-white/10 bg-black/40 p-4 shrink-0">
            <h2 className="mb-3 text-base font-black">Display Meta</h2>
            <div className="space-y-2.5">
              <input
                value={state.title}
                onChange={(e) => socket.emit('admin:pointtable:update_meta', { title: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-400/50"
                placeholder="Title"
              />
              <input
                value={state.subtitle}
                onChange={(e) => socket.emit('admin:pointtable:update_meta', { subtitle: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-400/50"
                placeholder="Subtitle"
              />
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-black/40 p-4 shrink-0">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-black">Public View</h2>
              <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] ${isConnected ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}>
                {isConnected ? 'Live' : 'Offline'}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {displayModes.map((mode) => {
                const Icon = mode.icon;
                const active = state.displayMode === mode.key;
                return (
                  <div key={mode.key} className={`rounded-2xl border p-3 ${active ? 'border-cyan-400/40 bg-cyan-400/10' : 'border-white/10 bg-white/5'}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Icon size={18} className={active ? 'text-cyan-300' : 'text-white/45'} />
                        <div>
                          <div className="text-sm font-bold text-white">{mode.label}</div>
                          <div className="text-[11px] text-white/45">Project this view.</div>
                        </div>
                      </div>
                      <button
                        onClick={() => showPublicView(mode.key)}
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.15em] text-white/80 hover:bg-white/10"
                      >
                        <Eye size={14} />
                        Show
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-black">Snapshot</h2>
            </div>
            <div className="custom-scrollbar h-full space-y-2 overflow-y-auto pr-1">
              {rankedTeams.slice(0, 6).map((team, index) => (
                <div key={team.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">#{index + 1}</div>
                    <div className="text-sm font-bold text-white">{team.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-cyan-300">{getTeamTotalScore(team, state.rounds)}</div>
                    <div className="text-[11px] text-white/45">{getTeamAccuracy(team, state.rounds).toFixed(0)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="xl:col-span-9 min-h-0 overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/40 p-4">
          <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black">Team Inputs</h2>
              <p className="text-xs text-white/45">Enter score gained and correct/incorrect counts for each Round 3 sub-round.</p>
            </div>
            <button
              onClick={() => socket.emit('admin:pointtable:add_team')}
              className="flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 hover:bg-cyan-400/20"
            >
              <Plus size={16} />
              Add Team
            </button>
          </div>

          <div className="custom-scrollbar h-[calc(100%-4rem)] overflow-auto">
            <table className="min-w-[940px] w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-white/35">
                  <th className="px-2 py-2">Team</th>
                  {state.rounds.map((round) => (
                    <th key={round.key} className="px-2 py-2">
                      <div>{round.label}</div>
                      <div className="mt-1 text-[9px] tracking-[0.08em] text-white/20">S / C / W</div>
                    </th>
                  ))}
                  <th className="w-[110px] px-2 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {state.teams.map((team) => (
                  <tr key={team.id} className="align-top">
                    <td className="rounded-l-2xl border border-white/10 bg-white/5 px-2 py-2">
                      <div className="flex items-start gap-2">
                        <input
                          value={team.name}
                          onChange={(e) => socket.emit('admin:pointtable:update_team_name', { teamId: team.id, name: e.target.value })}
                          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
                        />
                        <button
                          onClick={() => socket.emit('admin:pointtable:remove_team', { teamId: team.id })}
                          className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20"
                          title="Remove team"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                    {state.rounds.map((round) => {
                      const metrics = team.rounds?.[round.key] || {};
                      return (
                        <td key={`${team.id}-${round.key}`} className="border border-white/10 bg-white/5 px-2 py-2">
                          <div className="grid grid-cols-3 gap-2">
                            {['score', 'correct', 'incorrect'].map((field) => (
                              <input
                                key={field}
                                type="number"
                                min="0"
                                value={metrics[field] ?? 0}
                                onChange={(e) => socket.emit('admin:pointtable:update_metric', {
                                  teamId: team.id,
                                  roundKey: round.key,
                                  field,
                                  value: e.target.value,
                                })}
                                className="w-full rounded-lg border border-white/10 bg-black/40 px-1.5 py-1.5 text-center text-sm font-bold text-white outline-none focus:border-cyan-400/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                            ))}
                          </div>
                        </td>
                      );
                    })}
                    <td className="rounded-r-2xl border border-white/10 bg-white/5 px-2 py-2">
                      <div className="space-y-0.5 text-xs leading-tight">
                        <div className="font-black text-cyan-300">{getTeamTotalScore(team, state.rounds)} pts</div>
                        <div className="text-green-400">C {getTeamCorrectCount(team, state.rounds)}</div>
                        <div className="text-red-400">W {getTeamIncorrectCount(team, state.rounds)}</div>
                        <div className="text-yellow-300">{getTeamAccuracy(team, state.rounds).toFixed(0)}%</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
