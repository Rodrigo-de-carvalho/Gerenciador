-- ============================================================
-- Gerenciador Financeiro — Supabase Schema
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- ── PROJETOS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id                   uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 text        NOT NULL,
  description          text,
  icon                 text        NOT NULL DEFAULT '🏗️',
  color                text        NOT NULL DEFAULT '#3b82f6',
  include_in_overview  boolean     NOT NULL DEFAULT true,
  created_at           timestamptz DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own projects"
  ON public.projects
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── CATEGORIAS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  type       text        NOT NULL CHECK (type IN ('income', 'expense')),
  color      text        NOT NULL DEFAULT '#6b7280',
  icon       text        NOT NULL DEFAULT '📋',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own categories"
  ON public.categories
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── TRANSAÇÕES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text        NOT NULL CHECK (type IN ('income', 'expense')),
  description text        NOT NULL,
  amount      numeric(15,2) NOT NULL CHECK (amount > 0),
  date        date        NOT NULL,
  category_id uuid        REFERENCES public.categories(id) ON DELETE SET NULL,
  project_id  uuid        REFERENCES public.projects(id) ON DELETE SET NULL,
  notes       text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own transactions"
  ON public.transactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── MIGRAÇÃO: se já criou as tabelas antes, rode esta linha:
-- ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS include_in_overview boolean NOT NULL DEFAULT true;

-- ── METAS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goals (
  id            uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    uuid          REFERENCES public.projects(id) ON DELETE CASCADE,
  target_amount numeric(15,2),
  deadline      date,
  created_at    timestamptz   DEFAULT now(),
  UNIQUE (user_id, project_id)
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own goals"
  ON public.goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── INVESTIMENTOS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.investments (
  id            uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text          NOT NULL,
  type          text          NOT NULL,
  invested      numeric(15,2) NOT NULL DEFAULT 0,
  current_value numeric(15,2) NOT NULL DEFAULT 0,
  notes         text,
  date          date          DEFAULT CURRENT_DATE,
  created_at    timestamptz   DEFAULT now()
);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own investments"
  ON public.investments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── ORÇAMENTOS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.budgets (
  id          uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid          NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  amount      numeric(15,2) NOT NULL CHECK (amount > 0),
  created_at  timestamptz   DEFAULT now(),
  UNIQUE (user_id, category_id)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own budgets"
  ON public.budgets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── RECORRENTES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recurring (
  id           uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         text          NOT NULL CHECK (type IN ('income', 'expense')),
  description  text          NOT NULL,
  amount       numeric(15,2) NOT NULL CHECK (amount > 0),
  category_id  uuid          REFERENCES public.categories(id) ON DELETE SET NULL,
  day_of_month int           NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),
  active       boolean       NOT NULL DEFAULT true,
  next_date    date          NOT NULL,
  created_at   timestamptz   DEFAULT now()
);

ALTER TABLE public.recurring ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own recurring"
  ON public.recurring FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── ÍNDICES ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS investments_user_id ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS recurring_user_id ON public.recurring(user_id);
