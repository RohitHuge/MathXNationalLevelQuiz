const DEFAULT_ROUNDS = [
    { key: 'round3_sr1', label: 'R3 SR1' },
    { key: 'round3_sr2', label: 'R3 SR2' },
    { key: 'round3_sr3', label: 'R3 SR3' },
    { key: 'round3_sr4', label: 'R3 SR4' },
    { key: 'round3_sr5', label: 'R3 SR5' }
];

const createEmptyMetrics = () => ({
    score: 0,
    correct: 0,
    incorrect: 0
});

const createTeam = (id, name = `Team ${id}`) => ({
    id,
    name,
    rounds: Object.fromEntries(DEFAULT_ROUNDS.map((round) => [round.key, createEmptyMetrics()]))
});

let pointTableState = {
    rounds: DEFAULT_ROUNDS,
    teams: Array.from({ length: 6 }, (_, index) => createTeam(index + 1)),
    displayMode: 'table',
    title: 'MathX National Level Quiz',
    subtitle: 'Point Table',
    nextTeamId: 7
};

const emitPointTableState = (io, socket = null) => {
    if (socket) {
        socket.emit('server:pointtable:state_update', pointTableState);
        return;
    }
    io.emit('server:pointtable:state_update', pointTableState);
};

const sanitizeNumber = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
};

export const setupPointTableSockets = (io, socket) => {
    socket.emit('server:pointtable:state_update', pointTableState);

    socket.on('admin:pointtable:request_state', () => {
        emitPointTableState(io, socket);
    });

    socket.on('client:pointtable:request_state', () => {
        emitPointTableState(io, socket);
    });

    socket.on('admin:pointtable:set_display_mode', ({ mode }) => {
        if (!['table', 'scoreGraph', 'accuracyGraph'].includes(mode)) return;
        pointTableState.displayMode = mode;
        emitPointTableState(io);
    });

    socket.on('admin:pointtable:update_meta', ({ title, subtitle }) => {
        if (typeof title === 'string') pointTableState.title = title;
        if (typeof subtitle === 'string') pointTableState.subtitle = subtitle;
        emitPointTableState(io);
    });

    socket.on('admin:pointtable:update_round_label', ({ roundKey, label }) => {
        if (typeof label !== 'string') return;
        pointTableState.rounds = pointTableState.rounds.map((round) =>
            round.key === roundKey ? { ...round, label } : round
        );
        emitPointTableState(io);
    });

    socket.on('admin:pointtable:add_team', () => {
        const newTeam = createTeam(pointTableState.nextTeamId);
        pointTableState.teams = [...pointTableState.teams, newTeam];
        pointTableState.nextTeamId += 1;
        emitPointTableState(io);
    });

    socket.on('admin:pointtable:remove_team', ({ teamId }) => {
        if (pointTableState.teams.length <= 1) return;
        pointTableState.teams = pointTableState.teams.filter((team) => team.id !== teamId);
        emitPointTableState(io);
    });

    socket.on('admin:pointtable:update_team_name', ({ teamId, name }) => {
        if (typeof name !== 'string') return;
        pointTableState.teams = pointTableState.teams.map((team) =>
            team.id === teamId ? { ...team, name } : team
        );
        emitPointTableState(io);
    });

    socket.on('admin:pointtable:update_metric', ({ teamId, roundKey, field, value }) => {
        if (!['score', 'correct', 'incorrect'].includes(field)) return;

        pointTableState.teams = pointTableState.teams.map((team) => {
            if (team.id !== teamId) return team;
            if (!team.rounds[roundKey]) return team;

            return {
                ...team,
                rounds: {
                    ...team.rounds,
                    [roundKey]: {
                        ...team.rounds[roundKey],
                        [field]: Math.max(0, sanitizeNumber(value))
                    }
                }
            };
        });

        emitPointTableState(io);
    });

    socket.on('admin:pointtable:reset', () => {
        pointTableState = {
            rounds: DEFAULT_ROUNDS,
            teams: Array.from({ length: 6 }, (_, index) => createTeam(index + 1)),
            displayMode: 'table',
            title: 'MathX National Level Quiz',
            subtitle: 'Point Table',
            nextTeamId: 7
        };
        emitPointTableState(io);
    });
};
