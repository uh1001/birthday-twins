CREATE TABLE public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_user_id uuid NOT NULL,
  moderator_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.moderation_actions TO authenticated;
GRANT ALL ON public.moderation_actions TO service_role;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY mod_actions_read ON public.moderation_actions FOR SELECT TO authenticated USING (public.is_moderator());

CREATE OR REPLACE FUNCTION public.log_mod_action(p_action text, p_type text, p_target uuid, p_report uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.moderation_actions (moderator_user_id, moderator_profile_id, action, target_type, target_id, report_id, reason)
  VALUES (auth.uid(), public.my_pid(), p_action, p_type, p_target, p_report, p_reason);
END $$;
REVOKE EXECUTE ON FUNCTION public.log_mod_action(text,text,uuid,uuid,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.moderate_report(p_report uuid, p_action text, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.reports%ROWTYPE;
BEGIN
  IF NOT public.is_moderator() THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501'; END IF;
  IF coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;
  SELECT * INTO r FROM public.reports WHERE id = p_report FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Report not found'; END IF;
  IF p_action = 'dismiss' THEN
    UPDATE public.reports SET status = 'dismissed', resolved_at = now() WHERE id = p_report;
    PERFORM public.log_mod_action('dismiss_report', 'report', p_report, p_report, p_reason);
  ELSIF p_action = 'resolve' THEN
    UPDATE public.reports SET status = 'resolved', resolved_at = now() WHERE id = p_report;
    PERFORM public.log_mod_action('resolve_report', 'report', p_report, p_report, p_reason);
  ELSIF p_action = 'remove_post' THEN
    IF r.moment_id IS NULL THEN RAISE EXCEPTION 'Report has no post'; END IF;
    PERFORM public.log_mod_action('remove_post', 'moment', r.moment_id, p_report, p_reason);
    UPDATE public.reports SET status = 'resolved', resolved_at = now() WHERE moment_id = r.moment_id AND status = 'open';
    DELETE FROM public.moments WHERE id = r.moment_id;
  ELSIF p_action = 'remove_comment' THEN
    IF r.comment_id IS NULL THEN RAISE EXCEPTION 'Report has no comment'; END IF;
    PERFORM public.log_mod_action('remove_comment', 'comment', r.comment_id, p_report, p_reason);
    UPDATE public.reports SET status = 'resolved', resolved_at = now() WHERE comment_id = r.comment_id AND status = 'open';
    DELETE FROM public.comments WHERE id = r.comment_id;
  ELSE RAISE EXCEPTION 'Unknown action';
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.moderate_report(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_report(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderate_remove_content(p_type text, p_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_moderator() THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501'; END IF;
  IF coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;
  PERFORM public.log_mod_action('remove_' || p_type, p_type, p_id, NULL, p_reason);
  IF p_type = 'moment' THEN DELETE FROM public.moments WHERE id = p_id;
  ELSIF p_type = 'comment' THEN DELETE FROM public.comments WHERE id = p_id;
  ELSIF p_type = 'answer' THEN DELETE FROM public.answers WHERE id = p_id;
  ELSIF p_type = 'challenge_entry' THEN DELETE FROM public.challenge_entries WHERE id = p_id;
  ELSIF p_type = 'event' THEN DELETE FROM public.community_events WHERE id = p_id;
  ELSE RAISE EXCEPTION 'Unknown content type'; END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.moderate_remove_content(text,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_remove_content(text,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderate_save_challenge(p_id uuid, p_title text, p_description text, p_starts date, p_ends date, p_xp int, p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := p_id;
BEGIN
  IF NOT public.is_moderator() THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501'; END IF;
  IF coalesce(trim(p_title), '') = '' OR p_ends < p_starts OR p_xp NOT BETWEEN 0 AND 200 THEN RAISE EXCEPTION 'Invalid challenge'; END IF;
  IF cid IS NULL THEN
    INSERT INTO public.community_challenges (title, description, starts_on, ends_on, xp)
    VALUES (trim(p_title), coalesce(p_description, ''), p_starts, p_ends, p_xp) RETURNING id INTO cid;
    PERFORM public.log_mod_action('create_challenge', 'challenge', cid, NULL, coalesce(nullif(trim(p_reason), ''), 'New challenge'));
  ELSE
    UPDATE public.community_challenges SET title = trim(p_title), description = coalesce(p_description, ''),
      starts_on = p_starts, ends_on = p_ends, xp = p_xp WHERE id = cid;
    PERFORM public.log_mod_action('update_challenge', 'challenge', cid, NULL, coalesce(nullif(trim(p_reason), ''), 'Edited challenge'));
  END IF;
  RETURN cid;
END $$;
REVOKE EXECUTE ON FUNCTION public.moderate_save_challenge(uuid,text,text,date,date,int,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_save_challenge(uuid,text,text,date,date,int,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderate_delete_challenge(p_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_moderator() THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501'; END IF;
  IF coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;
  PERFORM public.log_mod_action('delete_challenge', 'challenge', p_id, NULL, p_reason);
  DELETE FROM public.challenge_entries WHERE challenge_id = p_id;
  DELETE FROM public.community_challenges WHERE id = p_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.moderate_delete_challenge(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_delete_challenge(uuid,text) TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated, anon;