export const TEAM_COLORS = [
  '#22d3ee',
  '#f472b6',
  '#facc15',
  '#4ade80',
  '#60a5fa',
  '#fb923c',
  '#c084fc',
  '#f87171',
];

export function getTeamTotalScore(team, rounds) {
  return rounds.reduce((sum, round) => sum + (team.rounds?.[round.key]?.score || 0), 0);
}

export function getTeamCorrectCount(team, rounds) {
  return rounds.reduce((sum, round) => sum + (team.rounds?.[round.key]?.correct || 0), 0);
}

export function getTeamIncorrectCount(team, rounds) {
  return rounds.reduce((sum, round) => sum + (team.rounds?.[round.key]?.incorrect || 0), 0);
}

export function getTeamAccuracy(team, rounds) {
  const correct = getTeamCorrectCount(team, rounds);
  const incorrect = getTeamIncorrectCount(team, rounds);
  const attempts = correct + incorrect;
  return attempts > 0 ? (correct / attempts) * 100 : 0;
}

export function getScoreSeries(team, rounds) {
  let running = 0;
  return rounds.map((round) => {
    running += team.rounds?.[round.key]?.score || 0;
    return running;
  });
}

export function getAccuracySeries(team, rounds) {
  return rounds.map((round) => {
    const metrics = team.rounds?.[round.key] || {};
    const correct = metrics.correct || 0;
    const incorrect = metrics.incorrect || 0;
    const attempts = correct + incorrect;
    return attempts > 0 ? (correct / attempts) * 100 : 0;
  });
}

export function sortTeamsByScore(teams, rounds) {
  return [...teams].sort((a, b) => {
    const scoreDiff = getTeamTotalScore(b, rounds) - getTeamTotalScore(a, rounds);
    if (scoreDiff !== 0) return scoreDiff;
    const accuracyDiff = getTeamAccuracy(b, rounds) - getTeamAccuracy(a, rounds);
    if (accuracyDiff !== 0) return accuracyDiff;
    return a.name.localeCompare(b.name);
  });
}
