
CREATE OR REPLACE FUNCTION public.viewer_blocked_from(target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_blocked_pair((SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), target)
$$;
DROP POLICY profiles_public_read ON public.profiles;
CREATE POLICY profiles_public_read ON public.profiles FOR SELECT TO anon, authenticated
  USING (auth.uid() IS NULL OR user_id = auth.uid() OR NOT public.viewer_blocked_from(id));
