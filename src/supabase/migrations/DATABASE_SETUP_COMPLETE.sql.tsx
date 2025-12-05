-- =====================================================================
-- CONFIGURACIÓN COMPLETA BASE DE DATOS - ReporteBuenaventura
-- =====================================================================
-- Este script contiene TODO lo necesario para que la base de datos
-- funcione correctamente con la aplicación
-- 
-- INSTRUCCIONES:
-- 1. Copia TODO el contenido de este archivo
-- 2. Pega en Supabase SQL Editor
-- 3. Click en "RUN"
-- 4. Espera a que termine sin errores
-- 
-- IMPORTANTE: Este script es idempotente (se puede ejecutar múltiples veces)
-- =====================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- PARTE 1: CREAR/ACTUALIZAR TABLAS
-- =====================================================================

-- =====================================================================
-- TABLA: profiles
-- Perfiles de usuarios con información adicional
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ciudadano' CHECK (role IN ('admin', 'ciudadano', 'entidad')),
  avatar_url TEXT,
  phone TEXT,
  is_blocked BOOLEAN DEFAULT FALSE,
  suspended_until TIMESTAMP WITH TIME ZONE,
  suspension_reason TEXT,
  suspended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Agregar columnas si no existen (para bases de datos existentes)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_blocked') THEN
    ALTER TABLE public.profiles ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'suspended_until') THEN
    ALTER TABLE public.profiles ADD COLUMN suspended_until TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'suspension_reason') THEN
    ALTER TABLE public.profiles ADD COLUMN suspension_reason TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'suspended_at') THEN
    ALTER TABLE public.profiles ADD COLUMN suspended_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- =====================================================================
-- TABLA: entities
-- Entidades responsables de atender reportes
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  address TEXT,
  whatsapp TEXT,
  keywords TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Agregar columnas si no existen
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entities' AND column_name = 'website') THEN
    ALTER TABLE public.entities ADD COLUMN website TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entities' AND column_name = 'address') THEN
    ALTER TABLE public.entities ADD COLUMN address TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entities' AND column_name = 'whatsapp') THEN
    ALTER TABLE public.entities ADD COLUMN whatsapp TEXT;
  END IF;
END $$;

-- =====================================================================
-- TABLA: reports
-- Reportes de problemas urbanos
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_revision', 'en_proceso', 'resuelto', 'rechazado')),
  priority TEXT DEFAULT 'media' CHECK (priority IN ('baja', 'media', 'alta', 'urgente')),
  entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
  entity_name TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  location_address TEXT,
  images TEXT[] DEFAULT '{}',
  is_anonymous BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  manually_assigned BOOLEAN DEFAULT FALSE,
  ai_classification JSONB,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.profiles(id),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Agregar columnas si no existen
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'manually_assigned') THEN
    ALTER TABLE public.reports ADD COLUMN manually_assigned BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'ai_classification') THEN
    ALTER TABLE public.reports ADD COLUMN ai_classification JSONB;
  END IF;
END $$;

-- =====================================================================
-- TABLA: comments
-- Comentarios en los reportes
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================================
-- TABLA: ratings
-- Calificaciones de reportes resueltos
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(report_id, user_id)
);

-- =====================================================================
-- TABLA: notifications
-- Notificaciones para los usuarios
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('report_created', 'report_updated', 'comment_added', 'status_changed', 'report_resolved')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================================
-- TABLA: report_followers
-- Seguimiento de reportes por usuarios
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.report_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_report_follow UNIQUE(user_id, report_id)
);

-- =====================================================================
-- TABLA: kv_store_4617db71
-- Almacenamiento clave-valor para datos generales
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.kv_store_4617db71 (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- PARTE 2: CREAR ÍNDICES
-- =====================================================================

-- Índices para profiles
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_is_blocked_idx ON public.profiles(is_blocked);
CREATE INDEX IF NOT EXISTS profiles_suspended_until_idx ON public.profiles(suspended_until);

-- Índices para entities
CREATE INDEX IF NOT EXISTS entities_name_idx ON public.entities(name);
CREATE INDEX IF NOT EXISTS entities_category_idx ON public.entities(category);
CREATE INDEX IF NOT EXISTS entities_is_active_idx ON public.entities(is_active);
CREATE INDEX IF NOT EXISTS entities_website_idx ON public.entities(website);

-- Índices para reports
CREATE INDEX IF NOT EXISTS reports_user_id_idx ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS reports_entity_id_idx ON public.reports(entity_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports(status);
CREATE INDEX IF NOT EXISTS reports_category_idx ON public.reports(category);
CREATE INDEX IF NOT EXISTS reports_created_at_idx ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS reports_is_public_idx ON public.reports(is_public);
CREATE INDEX IF NOT EXISTS reports_location_idx ON public.reports(location_lat, location_lng);

-- Índices para comments
CREATE INDEX IF NOT EXISTS comments_report_id_idx ON public.comments(report_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS comments_created_at_idx ON public.comments(created_at DESC);

-- Índices para ratings
CREATE INDEX IF NOT EXISTS ratings_report_id_idx ON public.ratings(report_id);
CREATE INDEX IF NOT EXISTS ratings_user_id_idx ON public.ratings(user_id);

-- Índices para notifications
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC);

-- Índices para report_followers
CREATE INDEX IF NOT EXISTS idx_report_followers_user_id ON public.report_followers(user_id);
CREATE INDEX IF NOT EXISTS idx_report_followers_report_id ON public.report_followers(report_id);
CREATE INDEX IF NOT EXISTS idx_report_followers_created_at ON public.report_followers(created_at DESC);

-- =====================================================================
-- PARTE 3: TRIGGERS
-- =====================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS entities_updated_at ON public.entities;
CREATE TRIGGER entities_updated_at
  BEFORE UPDATE ON public.entities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS reports_updated_at ON public.reports;
CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS comments_updated_at ON public.comments;
CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS ratings_updated_at ON public.ratings;
CREATE TRIGGER ratings_updated_at
  BEFORE UPDATE ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS kv_store_updated_at ON public.kv_store_4617db71;
CREATE TRIGGER kv_store_updated_at
  BEFORE UPDATE ON public.kv_store_4617db71
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuario'),
    CASE 
      WHEN NEW.email = 'admin@buenaventura.gov.co' THEN 'admin'
      WHEN NEW.email LIKE '%@buenaventura.gov.co' THEN 'entidad'
      ELSE 'ciudadano'
    END,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil al crear usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- PARTE 4: HABILITAR RLS
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kv_store_4617db71 ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- PARTE 5: ELIMINAR POLÍTICAS VIEJAS
-- =====================================================================

-- Eliminar todas las políticas existentes para recrearlas correctamente
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('profiles', 'entities', 'reports', 'comments', 'ratings', 'notifications', 'report_followers', 'kv_store_4617db71')
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
    END LOOP;
END $$;

-- =====================================================================
-- PARTE 6: POLÍTICAS RLS PARA PROFILES
-- =====================================================================

-- Perfiles son visibles para todos
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  USING (true);

-- Usuarios pueden actualizar su propio perfil
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins pueden actualizar cualquier perfil
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role puede hacer todo (CRÍTICO para el backend)
CREATE POLICY "profiles_service_role"
  ON public.profiles FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Admins pueden insertar perfiles
CREATE POLICY "profiles_insert_admin"
  ON public.profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- =====================================================================
-- PARTE 7: POLÍTICAS RLS PARA ENTITIES
-- =====================================================================

-- Entidades son visibles para todos
CREATE POLICY "entities_select_all"
  ON public.entities FOR SELECT
  USING (is_active = TRUE OR auth.uid() IS NOT NULL);

-- Admins pueden crear entidades
CREATE POLICY "entities_insert_admin"
  ON public.entities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins pueden actualizar entidades
CREATE POLICY "entities_update_admin"
  ON public.entities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins pueden eliminar entidades
CREATE POLICY "entities_delete_admin"
  ON public.entities FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================================
-- PARTE 8: POLÍTICAS RLS PARA REPORTS
-- =====================================================================

-- Reportes públicos son visibles para autenticados
CREATE POLICY "reports_select_public"
  ON public.reports FOR SELECT
  USING (
    is_public = TRUE OR
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Usuarios autenticados pueden crear reportes
CREATE POLICY "reports_insert_own"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuarios pueden actualizar sus propios reportes
CREATE POLICY "reports_update_own"
  ON public.reports FOR UPDATE
  USING (user_id = auth.uid());

-- Admins pueden actualizar cualquier reporte
CREATE POLICY "reports_update_admin"
  ON public.reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Usuarios pueden eliminar sus propios reportes
CREATE POLICY "reports_delete_own"
  ON public.reports FOR DELETE
  USING (user_id = auth.uid());

-- Admins pueden eliminar cualquier reporte
CREATE POLICY "reports_delete_admin"
  ON public.reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================================
-- PARTE 9: POLÍTICAS RLS PARA COMMENTS
-- =====================================================================

-- Comentarios visibles para autenticados
CREATE POLICY "comments_select_authenticated"
  ON public.comments FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Usuarios pueden crear comentarios
CREATE POLICY "comments_insert_own"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuarios pueden actualizar sus comentarios
CREATE POLICY "comments_update_own"
  ON public.comments FOR UPDATE
  USING (user_id = auth.uid());

-- Usuarios pueden eliminar sus comentarios
CREATE POLICY "comments_delete_own"
  ON public.comments FOR DELETE
  USING (user_id = auth.uid());

-- Admins pueden eliminar cualquier comentario
CREATE POLICY "comments_delete_admin"
  ON public.comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================================
-- PARTE 10: POLÍTICAS RLS PARA RATINGS
-- =====================================================================

-- Calificaciones visibles para autenticados
CREATE POLICY "ratings_select_authenticated"
  ON public.ratings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Usuarios pueden crear calificaciones
CREATE POLICY "ratings_insert_own"
  ON public.ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuarios pueden actualizar sus calificaciones
CREATE POLICY "ratings_update_own"
  ON public.ratings FOR UPDATE
  USING (user_id = auth.uid());

-- Usuarios pueden eliminar sus calificaciones
CREATE POLICY "ratings_delete_own"
  ON public.ratings FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================================
-- PARTE 11: POLÍTICAS RLS PARA NOTIFICATIONS
-- =====================================================================

-- Usuarios ven solo sus notificaciones
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- Sistema puede crear notificaciones
CREATE POLICY "notifications_insert_system"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Usuarios pueden actualizar sus notificaciones
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Usuarios pueden eliminar sus notificaciones
CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================================
-- PARTE 12: POLÍTICAS RLS PARA REPORT_FOLLOWERS
-- =====================================================================

-- Usuarios ven sus reportes seguidos
CREATE POLICY "report_followers_select_own"
  ON public.report_followers FOR SELECT
  USING (auth.uid() = user_id);

-- Admins ven todos los seguimientos
CREATE POLICY "report_followers_select_admin"
  ON public.report_followers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Usuarios pueden seguir reportes
CREATE POLICY "report_followers_insert_own"
  ON public.report_followers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuarios pueden dejar de seguir reportes
CREATE POLICY "report_followers_delete_own"
  ON public.report_followers FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================================
-- PARTE 13: POLÍTICAS RLS PARA KV_STORE
-- =====================================================================

-- Service role puede hacer todo
CREATE POLICY "kv_store_service_role"
  ON public.kv_store_4617db71 FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Admins pueden leer
CREATE POLICY "kv_store_select_admin"
  ON public.kv_store_4617db71 FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================================
-- PARTE 14: DATOS INICIALES
-- =====================================================================

-- Insertar entidades por defecto
INSERT INTO public.entities (name, description, category, contact_email, contact_phone, website, address, whatsapp, keywords) VALUES
  ('Alcaldía de Buenaventura', 'Alcaldía Municipal de Buenaventura', 'gobierno', 'contacto@buenaventura.gov.co', '+57 2 2420501', 'https://www.buenaventura.gov.co', 'Calle 1 # 1A-08, Centro, Buenaventura', '+573106507940', ARRAY['alcaldia', 'gobierno', 'municipal']),
  ('Secretaría de Infraestructura', 'Secretaría de Infraestructura y Obras Públicas', 'infraestructura', 'infraestructura@buenaventura.gov.co', '+57 2 2420502', 'https://www.buenaventura.gov.co', 'Calle 1 # 1A-08, Centro, Buenaventura', '+573106507940', ARRAY['infraestructura', 'obras', 'vias', 'calles', 'huecos']),
  ('Aguas de Buenaventura', 'Empresa de Acueducto y Alcantarillado', 'servicios', 'info@aguasdebuenaventura.gov.co', '+57 2 2430100', 'https://www.aguasdebuenaventura.gov.co', 'Carrera 3 # 2-45, Barrio El Centro', '+573106507941', ARRAY['agua', 'acueducto', 'alcantarillado', 'fuga']),
  ('EPSA - Energía del Pacífico', 'Empresa de Energía Eléctrica', 'servicios', 'atencion@epsa.com.co', '+57 2 2440200', 'https://www.epsa.com.co', 'Calle 2 # 3-22, Buenaventura', '+573106507942', ARRAY['energia', 'luz', 'electricidad', 'apagon']),
  ('Secretaría de Salud', 'Secretaría de Salud Municipal', 'salud', 'salud@buenaventura.gov.co', '+57 2 2420503', 'https://www.buenaventura.gov.co/salud', 'Calle 1 # 1A-08, Centro', '+573106507943', ARRAY['salud', 'hospital', 'epidemia']),
  ('Policía Nacional', 'Policía Nacional de Colombia', 'seguridad', 'buenaventura@policia.gov.co', '123', 'https://www.policia.gov.co', 'CAI Centro, Calle 3 # 4-15', '+573106507944', ARRAY['policia', 'seguridad', 'robo']),
  ('Bomberos Buenaventura', 'Cuerpo de Bomberos Voluntarios', 'emergencia', 'bomberos@buenaventura.gov.co', '119', 'https://www.bomberosbuenaventura.gov.co', 'Carrera 5 # 2-30, Barrio El Centro', '+573106507945', ARRAY['bomberos', 'incendio', 'emergencia']),
  ('Cruz Roja', 'Cruz Roja Colombiana - Seccional Buenaventura', 'emergencia', 'buenaventura@cruzroja.org.co', '132', 'https://www.cruzroja.org.co', 'Calle 4 # 6-20, Buenaventura', '+573106507946', ARRAY['cruz roja', 'emergencia', 'ambulancia']),
  ('Secretaría de Ambiente', 'Secretaría de Medio Ambiente', 'ambiente', 'ambiente@buenaventura.gov.co', '+57 2 2420504', 'https://www.buenaventura.gov.co', 'Calle 1 # 1A-08, Centro', '+573106507947', ARRAY['ambiente', 'basura', 'contaminacion']),
  ('Secretaría de Tránsito', 'Secretaría de Tránsito y Transporte', 'transito', 'transito@buenaventura.gov.co', '+57 2 2420505', 'https://www.buenaventura.gov.co', 'Carrera 2 # 3-45, Buenaventura', '+573106507948', ARRAY['transito', 'semaforo', 'accidente']),
  ('Defensa Civil', 'Defensa Civil Colombiana', 'emergencia', 'buenaventura@defensacivil.gov.co', '144', 'https://www.defensacivil.gov.co', 'Calle 5 # 7-10, Buenaventura', '+573106507949', ARRAY['defensa civil', 'desastre', 'inundacion'])
ON CONFLICT (name) DO NOTHING;

-- =====================================================================
-- PARTE 15: CREAR PERFILES PARA USUARIOS SIN PERFIL
-- =====================================================================

-- Insertar perfiles para usuarios que no los tienen
INSERT INTO public.profiles (id, email, name, role, created_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', 'Usuario') as name,
  CASE 
    WHEN u.email = 'admin@buenaventura.gov.co' THEN 'admin'
    WHEN u.email LIKE '%@buenaventura.gov.co' THEN 'entidad'
    ELSE 'ciudadano'
  END as role,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- PARTE 16: GRANTS
-- =====================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =====================================================================
-- PARTE 17: VERIFICACIÓN FINAL
-- =====================================================================

-- Verificar tablas
SELECT 
  '✅ TABLAS CREADAS:' as info,
  COUNT(*) as total_tablas
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'entities', 'reports', 'comments', 'ratings', 'notifications', 'report_followers', 'kv_store_4617db71');

-- Verificar políticas RLS
SELECT 
  '✅ POLÍTICAS RLS CREADAS:' as info,
  COUNT(*) as total_politicas
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'entities', 'reports', 'comments', 'ratings', 'notifications', 'report_followers', 'kv_store_4617db71');

-- Verificar índices
SELECT 
  '✅ ÍNDICES CREADOS:' as info,
  COUNT(*) as total_indices
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'entities', 'reports', 'comments', 'ratings', 'notifications', 'report_followers');

-- Verificar triggers
SELECT 
  '✅ TRIGGERS CREADOS:' as info,
  COUNT(*) as total_triggers
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Verificar que no hay usuarios sin perfil
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PERFECTO: Todos los usuarios tienen perfil'
    ELSE '⚠️ HAY ' || COUNT(*) || ' USUARIOS SIN PERFIL (ejecuta la Parte 15 nuevamente)'
  END as resultado
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Ver entidades creadas
SELECT 
  '✅ ENTIDADES CREADAS:' as info,
  COUNT(*) as total_entidades
FROM public.entities;

-- =====================================================================
-- ✅ ¡CONFIGURACIÓN COMPLETADA!
-- =====================================================================
-- 
-- SIGUIENTE PASO:
-- 1. Redesplegar Edge Function: make-server-e2de53ff
-- 2. Probar login en la aplicación
-- 3. Verificar que todas las funcionalidades funcionan
-- 
-- FUNCIONALIDADES INCLUIDAS:
-- ✅ Autenticación y perfiles de usuarios
-- ✅ Roles: Admin, Ciudadano, Entidad
-- ✅ Bloqueo y suspensión de usuarios
-- ✅ Creación y gestión de reportes
-- ✅ Comentarios en reportes
-- ✅ Calificaciones (ratings)
-- ✅ Notificaciones
-- ✅ Seguimiento de reportes (follow)
-- ✅ Entidades gubernamentales
-- ✅ Almacenamiento KV para datos generales
-- ✅ Clasificación IA de reportes
-- ✅ Geolocalización de reportes
-- ✅ Todas las políticas RLS configuradas
-- ✅ Todos los índices para rendimiento óptimo
-- ✅ Triggers automáticos
-- 
-- =====================================================================
