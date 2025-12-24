-- Type de rôles
CREATE TYPE public.app_role AS ENUM ('admin', 'support', 'analyst', 'user');

-- Table des rôles utilisateur
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT now(),
    granted_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- Fonction sécurisée pour vérifier les rôles (évite les boucles RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS sur user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Table de tracking d'activité utilisateur
CREATE TABLE public.user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_data JSONB,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour requêtes performantes
CREATE INDEX idx_activity_user_date ON public.user_activity_logs(user_id, created_at DESC);
CREATE INDEX idx_activity_type ON public.user_activity_logs(action_type);
CREATE INDEX idx_activity_session ON public.user_activity_logs(session_id);

-- RLS sur user_activity_logs
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log own activity"
ON public.user_activity_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity"
ON public.user_activity_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

-- T'ajouter comme admin (ton user_id)
INSERT INTO public.user_roles (user_id, role)
VALUES ('cccab58e-4cb0-4a7f-868b-a0f9cda3d492', 'admin');