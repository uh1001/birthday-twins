
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;
