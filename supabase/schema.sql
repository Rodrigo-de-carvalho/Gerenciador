-- ============================================================
-- Gerenciador Financeiro — Supabase Schema
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- ── PROJETOS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  description text,
  icon        text        NOT NULL DEFAULT '🏗️',
  color       text        NOT NULL DEFAULT '#3b82f6',
  created_at  timestamptz DEFAULT now()
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

-- ── ÍNDICES ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS projects_user_id ON public.projects(user_id);
