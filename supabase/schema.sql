-- ============================================
-- LOCOMOTIVE LMS - Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================

-- ===== PROFILES TABLE =====
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    first_name text,
    last_name text,
    email text,
    avatar_url text,
    plan text default 'free-trial',
    trial_days_remaining int default 7,
    joined_date timestamptz default now(),
    study_streak int default 0,
    total_study_hours numeric default 0,
    estimated_score numeric default 0,
    modules_completed int default 0,
    total_modules int default 72,
    exam_date date,
    daily_study_hours int default 2,
    focus_subjects text[] default '{}',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, first_name)
    values (
        new.id,
        new.email,
        coalesce(
            new.raw_user_meta_data ->> 'first_name',
            split_part(new.email, '@', 1)
        )
    );
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
    before update on public.profiles
    for each row execute procedure public.update_updated_at();

-- Profiles RLS
alter table public.profiles enable row level security;
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
drop policy if exists "Service role can insert profiles" on public.profiles;
create policy "Service role can insert profiles" on public.profiles for insert with check (true);


-- ============================================
-- PHASE 2: COURSES, QUESTIONS, TESTS, SCHEDULE
-- ============================================

-- ===== COURSES =====
create table if not exists public.courses (
    id text primary key,
    name text not null,
    icon text not null,
    color text not null,
    description text,
    total_lessons int default 0,
    total_questions int default 0,
    sort_order int default 0,
    created_at timestamptz default now()
);

alter table public.courses enable row level security;
drop policy if exists "Courses are publicly readable" on public.courses;
create policy "Courses are publicly readable" on public.courses for select using (true);

-- ===== MODULES =====
create table if not exists public.modules (
    id text primary key,
    course_id text references public.courses(id) on delete cascade not null,
    name text not null,
    sort_order int default 0
);

alter table public.modules enable row level security;
drop policy if exists "Modules are publicly readable" on public.modules;
create policy "Modules are publicly readable" on public.modules for select using (true);

-- ===== TOPICS =====
create table if not exists public.topics (
    id text primary key,
    module_id text references public.modules(id) on delete cascade not null,
    name text not null,
    question_count int default 0,
    lesson_type text check (lesson_type in ('video', 'pdf', 'quiz')) not null,
    sort_order int default 0
);

alter table public.topics enable row level security;
drop policy if exists "Topics are publicly readable" on public.topics;
create policy "Topics are publicly readable" on public.topics for select using (true);

-- ===== QUESTIONS =====
create table if not exists public.questions (
    id text primary key,
    subject text not null,
    topic text not null,
    difficulty text check (difficulty in ('easy', 'medium', 'hard')) not null,
    stem text not null,
    options jsonb not null,  -- array of strings
    correct_answer int not null,
    explanation text,
    source text check (source in ('official-imat', 'locomotive-original', 'italian-medical')) not null,
    year int,
    created_at timestamptz default now()
);

alter table public.questions enable row level security;
drop policy if exists "Questions are publicly readable" on public.questions;
create policy "Questions are publicly readable" on public.questions for select using (true);

-- ===== USER TOPIC PROGRESS =====
create table if not exists public.user_topic_progress (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    topic_id text references public.topics(id) on delete cascade not null,
    completed boolean default false,
    completed_at timestamptz,
    unique(user_id, topic_id)
);

alter table public.user_topic_progress enable row level security;
drop policy if exists "Users can view own progress" on public.user_topic_progress;
create policy "Users can view own progress" on public.user_topic_progress for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own progress" on public.user_topic_progress;
create policy "Users can insert own progress" on public.user_topic_progress for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own progress" on public.user_topic_progress;
create policy "Users can update own progress" on public.user_topic_progress for update using (auth.uid() = user_id);

-- ===== TEST RESULTS =====
create table if not exists public.test_results (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    date timestamptz default now(),
    duration text,
    mode text check (mode in ('timed', 'untimed')) not null,
    total_questions int not null,
    correct int not null,
    incorrect int not null,
    unanswered int not null,
    score numeric not null,
    max_score numeric not null,
    subjects text[] default '{}',
    source text,
    created_at timestamptz default now()
);

alter table public.test_results enable row level security;
drop policy if exists "Users can view own test results" on public.test_results;
create policy "Users can view own test results" on public.test_results for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own test results" on public.test_results;
create policy "Users can insert own test results" on public.test_results for insert with check (auth.uid() = user_id);

-- ===== TEST ANSWERS (individual question answers per test) =====
create table if not exists public.test_answers (
    id uuid default gen_random_uuid() primary key,
    test_result_id uuid references public.test_results(id) on delete cascade not null,
    question_id text references public.questions(id) on delete cascade not null,
    selected_answer int, -- null if unanswered
    is_correct boolean,
    created_at timestamptz default now()
);

alter table public.test_answers enable row level security;
drop policy if exists "Users can view own test answers" on public.test_answers;
create policy "Users can view own test answers" on public.test_answers for select
    using (exists (select 1 from public.test_results tr where tr.id = test_result_id and tr.user_id = auth.uid()));
drop policy if exists "Users can insert own test answers" on public.test_answers;
create policy "Users can insert own test answers" on public.test_answers for insert
    with check (exists (select 1 from public.test_results tr where tr.id = test_result_id and tr.user_id = auth.uid()));

-- ===== SCHEDULE EVENTS =====
create table if not exists public.schedule_events (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    date date not null,
    title text not null,
    type text check (type in ('study', 'test', 'dayoff')) not null,
    duration text,
    created_at timestamptz default now()
);

alter table public.schedule_events enable row level security;
drop policy if exists "Users can view own schedule" on public.schedule_events;
create policy "Users can view own schedule" on public.schedule_events for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own schedule" on public.schedule_events;
create policy "Users can insert own schedule" on public.schedule_events for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own schedule" on public.schedule_events;
create policy "Users can update own schedule" on public.schedule_events for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own schedule" on public.schedule_events;
create policy "Users can delete own schedule" on public.schedule_events for delete using (auth.uid() = user_id);
