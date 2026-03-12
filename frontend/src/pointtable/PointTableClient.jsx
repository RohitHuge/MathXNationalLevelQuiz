import React, { useEffect, useMemo, useState } from 'react';
import { Trophy, BarChart3, Percent, Presentation, Table2 } from 'lucide-react';
import { useSocket } from '../SocketContext';
import {
  TEAM_COLORS,
  getAccuracySeries,
  getScoreSeries,
  getTeamAccuracy,
  getTeamCorrectCount,
  getTeamIncorrectCount,
  getTeamTotalScore,
  sortTeamsByScore,
} from './pointTableUtils';

const CHART_HEIGHT = 340;
const CHART_WIDTH = 900;
const PADDING = { top: 24, right: 24, bottom: 64, left: 72 };

function LineGraph({ rounds, teams, type = 'score' }) {
  const chartSeries = teams.map((team, index) => ({
    id: team.id,
    name: team.name,
    color: TEAM_COLORS[index % TEAM_COLORS.length],
    values: type === 'score' ? getScoreSeries(team, rounds) : getAccuracySeries(team, rounds),
  }));

  const maxValue = Math.max(
    type === 'score' ? 10 : 100,
    ...chartSeries.flatMap((series) => series.values),
  );

  const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const stepX = rounds.length > 1 ? innerWidth / (rounds.length - 1) : innerWidth / 2;

  const getX = (index) => PADDING.left + (rounds.length > 1 ? index * stepX : innerWidth / 2);
  const getY = (value) => PADDING.top + innerHeight - (value / maxValue) * innerHeight;

  const tickValues = Array.from({ length: 5 }, (_, index) => (maxValue / 4) * index);

  return (
    <div className="h-full rounded-[2rem] border border-white/10 bg-black/40 p-5 overflow-hidden">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-white">
            {type === 'score' ? 'Score Progression' : 'Accuracy by Round'}
          </h3>
          <p className="text-sm text-white/45">
            {type === 'score' ? 'Cumulative score after each round/sub-round.' : 'Correct answer percentage in each round/sub-round.'}
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.3em] text-white/60">
          {type === 'score' ? 'Score' : 'Accuracy'}
        </div>
      </div>

      <div className="h-[calc(100%-5rem)]">
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-full w-full">
          {tickValues.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line x1={PADDING.left} x2={CHART_WIDTH - PADDING.right} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="6 6" />
                <text x={PADDING.left - 14} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.5)" fontSize="12">
                  {type === 'score' ? Math.round(tick) : `${Math.round(tick)}%`}
                </text>
              </g>
            );
          })}

          {rounds.map((round, index) => {
            const x = getX(index);
            return (
              <g key={round.key}>
                <line x1={x} x2={x} y1={PADDING.top} y2={CHART_HEIGHT - PADDING.bottom} stroke="rgba(255,255,255,0.04)" />
                <text x={x} y={CHART_HEIGHT - PADDING.bottom + 28} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="12">
                  {round.label}
                </text>
              </g>
            );
          })}

          {chartSeries.map((series) => {
            const points = series.values.map((value, index) => `${getX(index)},${getY(value)}`).join(' ');
            return (
              <g key={series.id}>
                <polyline fill="none" stroke={series.color} strokeWidth="4" points={points} strokeLinecap="round" strokeLinejoin="round" />
                {series.values.map((value, index) => (
                  <g key={`${series.id}-${index}`}>
                    <circle cx={getX(index)} cy={getY(value)} r="6" fill={series.color} />
                    <circle cx={getX(index)} cy={getY(value)} r="11" fill="transparent" stroke={series.color} strokeOpacity="0.25" />
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {chartSeries.map((series) => (
          <div key={series.id} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: series.color }}></span>
            <span className="text-sm font-bold text-white/85">{series.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PointsTable({ rounds, teams }) {
  const sortedTeams = sortTeamsByScore(teams, rounds);

  return (
    <div className="h-full rounded-[2rem] border border-white/10 bg-black/40 p-5 overflow-hidden">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-2xl font-black text-white">Overall Standings</h3>
          <p className="text-sm text-white/45">Total score, attempts, and accuracy for each team.</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.3em] text-white/60">
          Live Table
        </div>
      </div>

      <div className="h-[calc(100%-5rem)]">
        <table className="w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.2em] text-white/35">
              <th className="px-3">Rank</th>
              <th className="px-3">Team</th>
              <th className="px-3">Score</th>
              <th className="px-3">Correct</th>
              <th className="px-3">Wrong</th>
              <th className="px-3">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {sortedTeams.map((team, index) => {
              const totalScore = getTeamTotalScore(team, rounds);
              const totalCorrect = getTeamCorrectCount(team, rounds);
              const totalIncorrect = getTeamIncorrectCount(team, rounds);
              const accuracy = getTeamAccuracy(team, rounds);

              return (
                <tr key={team.id} className="bg-white/5">
                  <td className="rounded-l-2xl px-3 py-3 text-xl font-black text-white/80">{index + 1}</td>
                  <td className="px-3 py-3 text-lg font-bold text-white">{team.name}</td>
                  <td className="px-3 py-3 text-lg font-black text-cyan-300">{totalScore}</td>
                  <td className="px-3 py-3 text-base font-bold text-green-400">{totalCorrect}</td>
                  <td className="px-3 py-3 text-base font-bold text-red-400">{totalIncorrect}</td>
                  <td className="rounded-r-2xl px-3 py-3 text-base font-bold text-yellow-300">{accuracy.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PointTableClient() {
  const { socket } = useSocket();
  const [state, setState] = useState(null);

  useEffect(() => {
    if (!socket) return undefined;

    socket.on('server:pointtable:state_update', setState);
    socket.emit('client:pointtable:request_state');

    return () => {
      socket.off('server:pointtable:state_update');
    };
  }, [socket]);

  const sortedTeams = useMemo(() => {
    if (!state) return [];
    return sortTeamsByScore(state.teams || [], state.rounds || []);
  }, [state]);

  if (!state) {
    return (
      <div className="min-h-screen bg-[#041019] flex items-center justify-center">
        <div className="text-3xl font-black tracking-[0.3em] text-cyan-300 animate-pulse">LOADING TABLE</div>
      </div>
    );
  }

  const modeConfig = {
    table: { icon: Table2, label: 'Points Table' },
    scoreGraph: { icon: BarChart3, label: 'Score Graph' },
    accuracyGraph: { icon: Percent, label: 'Accuracy Graph' },
  };

  const ActiveIcon = modeConfig[state.displayMode]?.icon || Presentation;

  return (
    <div className="h-screen bg-[#041019] text-white overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] h-[40rem] w-[40rem] rounded-full bg-cyan-500/10 blur-[160px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] h-[40rem] w-[40rem] rounded-full bg-pink-500/10 blur-[160px] pointer-events-none"></div>

      <div className="relative z-10 flex h-screen flex-col overflow-hidden p-6 md:p-8">
        <header className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-[2rem] border border-white/10 bg-black/40 p-5 shrink-0">
          <div>
            <div className="mb-3 inline-flex items-center gap-3 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">
              <Trophy size={16} />
              MathX Scoreboard
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white">{state.title}</h1>
            <p className="mt-2 text-base md:text-lg text-white/55">{state.subtitle}</p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-4 shrink-0">
            <div className="mb-2 flex items-center gap-3 text-cyan-300">
              <ActiveIcon size={20} />
              <span className="text-xs font-bold uppercase tracking-[0.35em]">Current View</span>
            </div>
            <div className="text-2xl font-black text-white">{modeConfig[state.displayMode]?.label || 'Display'}</div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">
          {state.displayMode === 'table' && <PointsTable rounds={state.rounds} teams={state.teams} />}
          {state.displayMode === 'scoreGraph' && <LineGraph rounds={state.rounds} teams={sortedTeams} type="score" />}
          {state.displayMode === 'accuracyGraph' && <LineGraph rounds={state.rounds} teams={sortedTeams} type="accuracy" />}
        </main>
      </div>
    </div>
  );
}
