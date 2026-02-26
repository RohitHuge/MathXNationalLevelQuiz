-- Enable UUID generation (Postgres 13+)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- LABS TABLE
-- =========================
CREATE TABLE labs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_name TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- =========================
-- TEAM TABLE
-- =========================
CREATE TABLE team (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_name TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- =========================
-- USERS TABLE
-- =========================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    college_name TEXT,
    team_id UUID REFERENCES team(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- =========================
-- QUESTIONS TABLE
-- =========================
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content JSONB NOT NULL,
    marks INTEGER NOT NULL CHECK (marks >= 0),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- =========================
-- LIVE STATE TABLE
-- =========================
CREATE TABLE live_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    current_round TEXT,
    current_stage INTEGER CHECK (current_stage >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =========================
-- RESPONSES TABLE
-- =========================
CREATE TABLE responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    selected_option TEXT,
    is_correct BOOLEAN,
    answered_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- Optional: prevent same user answering same question twice
CREATE UNIQUE INDEX unique_user_question 
ON responses(user_id, question_id);

-- =========================
-- RESULTS TABLE
-- =========================
CREATE TABLE results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    total_score JSONB,
    submitted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- =========================
-- TEAM RESULTS TABLE
-- =========================
CREATE TABLE team_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES team(id) ON DELETE CASCADE,
    total_score JSONB,
    submitted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
