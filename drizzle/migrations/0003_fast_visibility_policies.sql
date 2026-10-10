
CREATE OR REPLACE FUNCTION public.my_pid()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.my_hidden_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT public.my_pid() AS id)
  SELECT coalesce(array_agg(x), '{}') FROM (
    SELECT CASE WHEN b.blocker_id = me.id THEN b.blocked_id ELSE b.blocker_id END AS x
    FROM public.blocks b, me WHERE me.id IS NOT NULL AND (b.blocker_id = me.id OR b.blocked_id = me.id)
  ) s
$$;

CREATE OR REPLACE FUNCTION public.my_private_hidden_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT public.my_pid() AS id)
  SELECT coalesce(array_agg(p.id), '{}') FROM public.profiles p, me
  WHERE p.is_private AND p.id IS DISTINCT FROM me.id
    AND NOT EXISTS (SELECT 1 FROM public.connections c WHERE c.status = 'accepted'
      AND ((c.follower_id = p.id AND c.following_id = me.id) OR (c.following_id = p.id AND c.follower_id = me.id)))
$$;

DROP POLICY profiles_public_read ON public.profiles;
CREATE POLICY profiles_public_read ON public.profiles FOR SELECT TO anon, authenticated
  USING (NOT (id = ANY (coalesce((SELECT public.my_hidden_ids()), '{}'::uuid[]))));

DROP POLICY moments_read ON public.moments;
CREATE POLICY moments_read ON public.moments FOR SELECT TO anon, authenticated
  USING (NOT (profile_id = ANY (coalesce((SELECT public.my_hidden_ids()), '{}'::uuid[])))
     AND NOT (profile_id = ANY (coalesce((SELECT public.my_private_hidden_ids()), '{}'::uuid[]))));

DROP POLICY comments_read ON public.comments;
CREATE POLICY comments_read ON public.comments FOR SELECT TO anon, authenticated
  USING (NOT (profile_id = ANY (coalesce((SELECT public.my_hidden_ids()), '{}'::uuid[]))));

DROP POLICY answers_read ON public.answers;
CREATE POLICY answers_read ON public.answers FOR SELECT TO anon, authenticated
  USING (NOT (profile_id = ANY (coalesce((SELECT public.my_hidden_ids()), '{}'::uuid[])))
     AND NOT (profile_id = ANY (coalesce((SELECT public.my_private_hidden_ids()), '{}'::uuid[]))));

DROP POLICY entries_read ON public.challenge_entries;
CREATE POLICY entries_read ON public.challenge_entries FOR SELECT TO authenticated
  USING (NOT (profile_id = ANY (coalesce((SELECT public.my_hidden_ids()), '{}'::uuid[])))
     AND NOT (profile_id = ANY (coalesce((SELECT public.my_private_hidden_ids()), '{}'::uuid[]))));

CREATE INDEX IF NOT EXISTS likes_moment_idx ON public.likes (moment_id);
CREATE INDEX IF NOT EXISTS moments_created_idx ON public.moments (created_at DESC);
CREATE INDEX IF NOT EXISTS moments_kind_idx ON public.moments (kind, created_at DESC);
