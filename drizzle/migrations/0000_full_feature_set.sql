
-- ========== HELPERS ==========
CREATE OR REPLACE FUNCTION public.is_blocked_pair(a uuid, b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a IS NOT NULL AND b IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = a AND blocked_id = b) OR (blocker_id = b AND blocked_id = a))
$$;

-- ========== ROLES ==========
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_roles_read_own ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin')
$$;

-- ========== PROFILE PRIVACY ==========
ALTER TABLE public.profiles
  ADD COLUMN show_birth_year boolean NOT NULL DEFAULT false,
  ADD COLUMN show_location boolean NOT NULL DEFAULT true,
  ADD COLUMN show_in_yearbook boolean NOT NULL DEFAULT true,
  ADD COLUMN message_permission text NOT NULL DEFAULT 'everyone',
  ADD COLUMN notification_prefs jsonb NOT NULL DEFAULT '{"likes":true,"comments":true,"connections":true,"messages":true,"community":true,"challenges":true,"birthdays":true}'::jsonb;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_message_permission_chk CHECK (message_permission IN ('everyone','connections','nobody'));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_birth_month_chk CHECK (birth_month IS NULL OR birth_month BETWEEN 1 AND 12);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_birth_day_chk CHECK (birth_day IS NULL OR birth_day BETWEEN 1 AND 31);

CREATE TABLE public.profile_private (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  birth_year int CHECK (birth_year IS NULL OR birth_year BETWEEN 1900 AND 2100),
  city text,
  country text,
  country_code text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profile_private TO authenticated;
GRANT ALL ON public.profile_private TO service_role;
ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;
CREATE POLICY profile_private_own ON public.profile_private FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id()) WITH CHECK (profile_id = public.current_profile_id());

CREATE OR REPLACE FUNCTION public.profiles_before_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE priv public.profile_private%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN NEW.xp := 0; NEW.is_demo := false; END IF;
    RETURN NEW;
  END IF;
  IF coalesce(current_setting('app.xp_ok', true), '') <> '1' THEN
    NEW.xp := OLD.xp;
  END IF;
  IF auth.uid() IS NOT NULL THEN NEW.is_demo := OLD.is_demo; END IF;

  SELECT * INTO priv FROM public.profile_private WHERE profile_id = NEW.id;
  IF FOUND THEN
    IF (NEW.birth_year IS DISTINCT FROM OLD.birth_year AND NEW.birth_year IS NOT NULL)
       OR (NEW.city IS DISTINCT FROM OLD.city AND NEW.city IS NOT NULL)
       OR (NEW.country IS DISTINCT FROM OLD.country AND NEW.country IS NOT NULL) THEN
      PERFORM set_config('app.syncing', '1', true);
      UPDATE public.profile_private SET
        birth_year = CASE WHEN NEW.birth_year IS DISTINCT FROM OLD.birth_year AND NEW.birth_year IS NOT NULL THEN NEW.birth_year ELSE birth_year END,
        city = CASE WHEN NEW.city IS DISTINCT FROM OLD.city AND NEW.city IS NOT NULL THEN NEW.city ELSE city END,
        country = CASE WHEN NEW.country IS DISTINCT FROM OLD.country AND NEW.country IS NOT NULL THEN NEW.country ELSE country END,
        country_code = CASE WHEN NEW.country IS DISTINCT FROM OLD.country AND NEW.country IS NOT NULL THEN NEW.country_code ELSE country_code END,
        updated_at = now()
      WHERE profile_id = NEW.id
      RETURNING * INTO priv;
      PERFORM set_config('app.syncing', '', true);
    END IF;
    NEW.birth_year := CASE WHEN NEW.show_age OR NEW.show_birth_year THEN priv.birth_year ELSE NULL END;
    NEW.city := CASE WHEN NEW.show_location THEN priv.city ELSE NULL END;
    NEW.country := CASE WHEN NEW.show_location THEN priv.country ELSE NULL END;
    NEW.country_code := CASE WHEN NEW.show_location THEN priv.country_code ELSE NULL END;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_before_write BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_before_write();

CREATE OR REPLACE FUNCTION public.profiles_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profile_private (profile_id, birth_year, city, country, country_code)
  VALUES (NEW.id, NEW.birth_year, NEW.city, NEW.country, NEW.country_code)
  ON CONFLICT (profile_id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_after_insert AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_after_insert();

CREATE OR REPLACE FUNCTION public.profile_private_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(current_setting('app.syncing', true), '') = '1' THEN RETURN NEW; END IF;
  UPDATE public.profiles SET id = id WHERE id = NEW.profile_id;
  RETURN NEW;
END $$;
CREATE TRIGGER profile_private_sync AFTER INSERT OR UPDATE ON public.profile_private
  FOR EACH ROW EXECUTE FUNCTION public.profile_private_sync();

INSERT INTO public.profile_private (profile_id, birth_year, city, country, country_code)
SELECT id, birth_year, city, country, country_code FROM public.profiles
ON CONFLICT (profile_id) DO NOTHING;

DROP POLICY profiles_public_read ON public.profiles;
CREATE POLICY profiles_public_read ON public.profiles FOR SELECT TO anon, authenticated
  USING (NOT public.is_blocked_pair(public.current_profile_id(), id));

-- ========== CONNECTIONS (requests) ==========
ALTER TABLE public.connections ADD COLUMN status text NOT NULL DEFAULT 'accepted';
ALTER TABLE public.connections ADD COLUMN accepted_at timestamptz;
ALTER TABLE public.connections ADD CONSTRAINT connections_status_chk CHECK (status IN ('pending','accepted'));
ALTER TABLE public.connections ALTER COLUMN status SET DEFAULT 'pending';
UPDATE public.connections SET accepted_at = created_at WHERE status = 'accepted';

CREATE OR REPLACE FUNCTION public.are_connected(a uuid, b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.connections WHERE status = 'accepted'
    AND ((follower_id = a AND following_id = b) OR (follower_id = b AND following_id = a)))
$$;

DROP POLICY connections_public_read ON public.connections;
DROP POLICY connections_write_own ON public.connections;
CREATE POLICY connections_read ON public.connections FOR SELECT TO anon, authenticated
  USING (status = 'accepted' OR follower_id = public.current_profile_id() OR following_id = public.current_profile_id());
CREATE POLICY connections_request ON public.connections FOR INSERT TO authenticated
  WITH CHECK (follower_id = public.current_profile_id() AND status = 'pending'
    AND follower_id <> following_id AND NOT public.is_blocked_pair(follower_id, following_id));
CREATE POLICY connections_accept ON public.connections FOR UPDATE TO authenticated
  USING (following_id = public.current_profile_id()) WITH CHECK (following_id = public.current_profile_id());
CREATE POLICY connections_remove ON public.connections FOR DELETE TO authenticated
  USING (follower_id = public.current_profile_id() OR following_id = public.current_profile_id());

-- ========== CONTENT VISIBILITY ==========
CREATE OR REPLACE FUNCTION public.can_view_content(owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN owner = public.current_profile_id() THEN true
    WHEN public.is_blocked_pair(public.current_profile_id(), owner) THEN false
    WHEN (SELECT is_private FROM public.profiles WHERE id = owner) THEN public.are_connected(public.current_profile_id(), owner)
    ELSE true END
$$;

-- ========== MOMENTS / POSTS ==========
ALTER TABLE public.moments
  ADD COLUMN kind text NOT NULL DEFAULT 'moment',
  ADD COLUMN media_type text,
  ADD COLUMN updated_at timestamptz;
ALTER TABLE public.moments ADD CONSTRAINT moments_kind_chk CHECK (kind IN ('moment','post','journey'));
ALTER TABLE public.moments ADD CONSTRAINT moments_media_chk CHECK (media_type IS NULL OR media_type IN ('image','video'));
ALTER TABLE public.moments ADD CONSTRAINT moments_body_len_chk CHECK (char_length(body) <= 2000);
UPDATE public.moments SET media_type = CASE WHEN video_url IS NOT NULL THEN 'video' WHEN image_url IS NOT NULL THEN 'image' END;

DROP POLICY moments_public_read ON public.moments;
CREATE POLICY moments_read ON public.moments FOR SELECT TO anon, authenticated USING (public.can_view_content(profile_id));
CREATE POLICY moments_moderator_delete ON public.moments FOR DELETE TO authenticated USING (public.is_moderator());

DROP POLICY comments_public_read ON public.comments;
CREATE POLICY comments_read ON public.comments FOR SELECT TO anon, authenticated
  USING (NOT public.is_blocked_pair(public.current_profile_id(), profile_id));
CREATE POLICY comments_moderator_delete ON public.comments FOR DELETE TO authenticated USING (public.is_moderator());
ALTER TABLE public.comments ADD CONSTRAINT comments_body_len_chk CHECK (char_length(body) BETWEEN 1 AND 1000);

DROP POLICY answers_public_read ON public.answers;
CREATE POLICY answers_read ON public.answers FOR SELECT TO anon, authenticated USING (public.can_view_content(profile_id));
CREATE POLICY answers_moderator_delete ON public.answers FOR DELETE TO authenticated USING (public.is_moderator());

CREATE TABLE public.saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id uuid NOT NULL REFERENCES public.moments(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (moment_id, profile_id)
);
GRANT SELECT, INSERT, DELETE ON public.saves TO authenticated;
GRANT ALL ON public.saves TO service_role;
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY saves_own ON public.saves FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id()) WITH CHECK (profile_id = public.current_profile_id());

-- ========== MESSAGES ==========
CREATE OR REPLACE FUNCTION public.can_message(target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.is_blocked_pair(public.current_profile_id(), target) THEN false
    ELSE coalesce((SELECT CASE p.message_permission
        WHEN 'everyone' THEN p.allow_messages
        WHEN 'connections' THEN p.allow_messages AND public.are_connected(public.current_profile_id(), target)
        ELSE false END
      FROM public.profiles p WHERE p.id = target), false)
  END
$$;
DROP POLICY messages_insert_own ON public.messages;
CREATE POLICY messages_insert_own ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = public.current_profile_id() AND public.can_message(recipient_id));
DROP POLICY messages_update_participants ON public.messages;
CREATE POLICY messages_mark_read ON public.messages FOR UPDATE TO authenticated
  USING (recipient_id = public.current_profile_id()) WITH CHECK (recipient_id = public.current_profile_id());
REVOKE UPDATE ON public.messages FROM authenticated;
GRANT UPDATE (read_at) ON public.messages TO authenticated;
ALTER TABLE public.messages ADD CONSTRAINT messages_body_len_chk CHECK (char_length(body) BETWEEN 1 AND 1000);

-- ========== REPORTS / MODERATION ==========
ALTER TABLE public.reports
  ADD COLUMN moment_id uuid REFERENCES public.moments(id) ON DELETE SET NULL,
  ADD COLUMN comment_id uuid REFERENCES public.comments(id) ON DELETE SET NULL,
  ADD COLUMN status text NOT NULL DEFAULT 'open',
  ADD COLUMN resolved_at timestamptz;
ALTER TABLE public.reports ADD CONSTRAINT reports_status_chk CHECK (status IN ('open','resolved','dismissed'));
GRANT UPDATE (status, resolved_at) ON public.reports TO authenticated;
CREATE POLICY reports_moderator_read ON public.reports FOR SELECT TO authenticated USING (public.is_moderator());
CREATE POLICY reports_moderator_update ON public.reports FOR UPDATE TO authenticated USING (public.is_moderator()) WITH CHECK (public.is_moderator());

-- ========== EVENTS & CHALLENGES ==========
CREATE TABLE public.community_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  birth_month int NOT NULL CHECK (birth_month BETWEEN 1 AND 12),
  birth_day int NOT NULL CHECK (birth_day BETWEEN 1 AND 31),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  description text CHECK (description IS NULL OR char_length(description) <= 1000),
  location text CHECK (location IS NULL OR char_length(location) <= 120),
  starts_at timestamptz NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.community_events TO authenticated;
GRANT ALL ON public.community_events TO service_role;
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_read ON public.community_events FOR SELECT TO authenticated USING (true);
CREATE POLICY events_create_member ON public.community_events FOR INSERT TO authenticated
  WITH CHECK (created_by = public.current_profile_id() AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = created_by AND p.birth_month = community_events.birth_month AND p.birth_day = community_events.birth_day));
CREATE POLICY events_delete ON public.community_events FOR DELETE TO authenticated
  USING (created_by = public.current_profile_id() OR public.is_moderator());

CREATE TABLE public.event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, profile_id)
);
GRANT SELECT, INSERT, DELETE ON public.event_rsvps TO authenticated;
GRANT ALL ON public.event_rsvps TO service_role;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY rsvps_read ON public.event_rsvps FOR SELECT TO authenticated USING (true);
CREATE POLICY rsvps_own ON public.event_rsvps FOR INSERT TO authenticated WITH CHECK (profile_id = public.current_profile_id());
CREATE POLICY rsvps_delete_own ON public.event_rsvps FOR DELETE TO authenticated USING (profile_id = public.current_profile_id());

CREATE TABLE public.community_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  xp int NOT NULL DEFAULT 25,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_challenges TO authenticated;
GRANT ALL ON public.community_challenges TO service_role;
ALTER TABLE public.community_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY challenges_read ON public.community_challenges FOR SELECT TO authenticated USING (true);

CREATE TABLE public.challenge_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.community_challenges(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, profile_id)
);
GRANT SELECT, INSERT, DELETE ON public.challenge_entries TO authenticated;
GRANT ALL ON public.challenge_entries TO service_role;
ALTER TABLE public.challenge_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY entries_read ON public.challenge_entries FOR SELECT TO authenticated USING (public.can_view_content(profile_id));
CREATE POLICY entries_own ON public.challenge_entries FOR INSERT TO authenticated WITH CHECK (profile_id = public.current_profile_id());
CREATE POLICY entries_delete ON public.challenge_entries FOR DELETE TO authenticated USING (profile_id = public.current_profile_id() OR public.is_moderator());

INSERT INTO public.community_challenges (title, description, starts_on, ends_on, xp) VALUES
 ('Window view', 'Describe what you can see from your window right now, wherever you are in the world.', '2026-10-01', '2026-12-31', 25),
 ('One thing I learned this year', 'Share a lesson from the year since your last birthday.', '2026-10-01', '2026-12-31', 30),
 ('Local food, global twins', 'Tell your twins about a dish everyone should try where you live.', '2026-10-01', '2026-12-31', 25),
 ('Letter to next-birthday me', 'Write a few lines to the person you will be on your next birthday.', '2026-10-01', '2027-03-31', 35);

-- ========== XP ==========
CREATE TABLE public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  ref_id uuid NOT NULL,
  points int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, action, ref_id)
);
CREATE INDEX xp_events_profile_idx ON public.xp_events (profile_id, action, created_at);
GRANT SELECT ON public.xp_events TO authenticated;
GRANT ALL ON public.xp_events TO service_role;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY xp_events_read ON public.xp_events FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.award_xp(p_profile uuid, p_action text, p_ref uuid, p_points int, p_daily_cap int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF p_daily_cap IS NOT NULL THEN
    SELECT count(*) INTO n FROM public.xp_events
     WHERE profile_id = p_profile AND action = p_action AND created_at > now() - interval '1 day';
    IF n >= p_daily_cap THEN RETURN; END IF;
  END IF;
  INSERT INTO public.xp_events (profile_id, action, ref_id, points)
  VALUES (p_profile, p_action, p_ref, p_points) ON CONFLICT DO NOTHING;
  IF FOUND THEN
    PERFORM set_config('app.xp_ok', '1', true);
    UPDATE public.profiles SET xp = xp + p_points WHERE id = p_profile;
    PERFORM set_config('app.xp_ok', '', true);
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.award_xp(uuid, text, uuid, int, int) FROM PUBLIC, anon, authenticated;

-- ========== NOTIFICATIONS ==========
ALTER TABLE public.notifications
  ADD COLUMN category text NOT NULL DEFAULT 'community',
  ADD COLUMN link text;

CREATE OR REPLACE FUNCTION public.notify(p_target uuid, p_actor uuid, p_kind text, p_category text, p_title text, p_body text, p_link text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prefs jsonb;
BEGIN
  IF p_target IS NULL OR p_target = p_actor THEN RETURN; END IF;
  IF public.is_blocked_pair(p_target, p_actor) THEN RETURN; END IF;
  SELECT notification_prefs INTO prefs FROM public.profiles WHERE id = p_target;
  IF coalesce(prefs ->> p_category, 'true') = 'false' THEN RETURN; END IF;
  INSERT INTO public.notifications (profile_id, actor_id, kind, category, title, body, link)
  VALUES (p_target, p_actor, p_kind, p_category, p_title, p_body, p_link);
END $$;
REVOKE EXECUTE ON FUNCTION public.notify(uuid, uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.actor_name(p uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT first_name FROM public.profiles WHERE id = p), 'Someone')
$$;

CREATE OR REPLACE FUNCTION public.on_moment_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_xp(NEW.profile_id, 'share', NEW.id, 15, 5);
  RETURN NEW;
END $$;
CREATE TRIGGER moments_after_insert AFTER INSERT ON public.moments FOR EACH ROW EXECUTE FUNCTION public.on_moment_insert();

CREATE OR REPLACE FUNCTION public.on_answer_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_xp(NEW.profile_id, 'answer', NEW.question_id, 20, NULL);
  RETURN NEW;
END $$;
CREATE TRIGGER answers_after_insert AFTER INSERT ON public.answers FOR EACH ROW EXECUTE FUNCTION public.on_answer_insert();

CREATE OR REPLACE FUNCTION public.on_comment_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner uuid;
BEGIN
  SELECT profile_id INTO owner FROM public.moments WHERE id = NEW.moment_id;
  IF owner IS DISTINCT FROM NEW.profile_id THEN
    PERFORM public.award_xp(NEW.profile_id, 'comment', NEW.id, 3, 10);
  END IF;
  PERFORM public.notify(owner, NEW.profile_id, 'comment', 'comments',
    public.actor_name(NEW.profile_id) || ' commented on your post', left(NEW.body, 120), '/p/' || NEW.moment_id);
  RETURN NEW;
END $$;
CREATE TRIGGER comments_after_insert AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.on_comment_insert();

CREATE OR REPLACE FUNCTION public.on_like_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner uuid;
BEGIN
  SELECT profile_id INTO owner FROM public.moments WHERE id = NEW.moment_id;
  PERFORM public.notify(owner, NEW.profile_id, 'reaction', 'likes',
    public.actor_name(NEW.profile_id) || ' liked your post', NULL, '/p/' || NEW.moment_id);
  RETURN NEW;
END $$;
CREATE TRIGGER likes_after_insert AFTER INSERT ON public.likes FOR EACH ROW EXECUTE FUNCTION public.on_like_insert();

CREATE OR REPLACE FUNCTION public.on_message_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify(NEW.recipient_id, NEW.sender_id, 'message', 'messages',
    'New message from ' || public.actor_name(NEW.sender_id), left(NEW.body, 120), '/messages/' || NEW.sender_id);
  RETURN NEW;
END $$;
CREATE TRIGGER messages_after_insert AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.on_message_insert();

CREATE OR REPLACE FUNCTION public.on_connection_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uname text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    PERFORM public.notify(NEW.following_id, NEW.follower_id, 'connection', 'connections',
      public.actor_name(NEW.follower_id) || ' wants to connect', 'You share a birthday.', '/connections');
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.follower_id := OLD.follower_id; NEW.following_id := OLD.following_id;
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
      NEW.accepted_at := now();
      SELECT username INTO uname FROM public.profiles WHERE id = NEW.following_id;
      PERFORM public.notify(NEW.follower_id, NEW.following_id, 'connection', 'connections',
        public.actor_name(NEW.following_id) || ' accepted your connection', 'Say hello and ask about their day.', '/u/' || uname);
      PERFORM public.award_xp(NEW.follower_id, 'connect', NEW.following_id, 10, 10);
      PERFORM public.award_xp(NEW.following_id, 'connect', NEW.follower_id, 10, 10);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER connections_before_insert_update BEFORE INSERT OR UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.on_connection_change();

CREATE OR REPLACE FUNCTION public.on_entry_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pts int;
BEGIN
  SELECT xp INTO pts FROM public.community_challenges WHERE id = NEW.challenge_id;
  PERFORM public.award_xp(NEW.profile_id, 'challenge', NEW.challenge_id, coalesce(pts, 25), NULL);
  RETURN NEW;
END $$;
CREATE TRIGGER entries_after_insert AFTER INSERT ON public.challenge_entries FOR EACH ROW EXECUTE FUNCTION public.on_entry_insert();

CREATE OR REPLACE FUNCTION public.on_event_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m record;
BEGIN
  PERFORM public.award_xp(NEW.created_by, 'event', NEW.id, 15, 2);
  FOR m IN SELECT id FROM public.profiles
    WHERE birth_month = NEW.birth_month AND birth_day = NEW.birth_day AND id <> NEW.created_by AND NOT is_demo LIMIT 500
  LOOP
    PERFORM public.notify(m.id, NEW.created_by, 'community', 'community',
      'New community event: ' || NEW.title, public.actor_name(NEW.created_by) || ' is hosting', '/community');
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER events_after_insert AFTER INSERT ON public.community_events FOR EACH ROW EXECUTE FUNCTION public.on_event_insert();

CREATE OR REPLACE FUNCTION public.on_profile_onboarded() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.onboarded AND NOT coalesce(OLD.onboarded, false) THEN
    PERFORM public.award_xp(NEW.id, 'profile_complete', NEW.id, 50, NULL);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_after_onboarded AFTER UPDATE OF onboarded ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.on_profile_onboarded();

CREATE OR REPLACE FUNCTION public.year_twin_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id FROM public.profiles me
  JOIN public.profile_private mp ON mp.profile_id = me.id
  JOIN public.profiles p ON p.birth_month = me.birth_month AND p.birth_day = me.birth_day AND p.id <> me.id
  JOIN public.profile_private pp ON pp.profile_id = p.id AND pp.birth_year = mp.birth_year
  WHERE me.id = public.current_profile_id() AND mp.birth_year IS NOT NULL
    AND NOT public.is_blocked_pair(me.id, p.id)
$$;

CREATE OR REPLACE FUNCTION public.ensure_birthday_notification()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me public.profiles%ROWTYPE; tag text; y int := extract(year FROM now())::int;
  leap boolean;
BEGIN
  SELECT * INTO me FROM public.profiles WHERE id = public.current_profile_id();
  IF NOT FOUND OR me.birth_month IS NULL THEN RETURN; END IF;
  leap := (y % 4 = 0 AND (y % 100 <> 0 OR y % 400 = 0));
  IF NOT (extract(month FROM now())::int = me.birth_month AND (extract(day FROM now())::int = me.birth_day
     OR (me.birth_month = 2 AND me.birth_day = 29 AND NOT leap AND extract(day FROM now())::int = 28))) THEN
    RETURN;
  END IF;
  tag := '/community?year=' || y;
  IF EXISTS (SELECT 1 FROM public.notifications WHERE profile_id = me.id AND kind = 'birthday' AND link = tag) THEN RETURN; END IF;
  IF coalesce(me.notification_prefs ->> 'birthdays', 'true') = 'false' THEN RETURN; END IF;
  INSERT INTO public.notifications (profile_id, kind, category, title, body, link)
  VALUES (me.id, 'birthday', 'birthdays', 'Happy birthday! 🎉', 'Your Birthday Twins around the world are celebrating with you.', tag);
END $$;

-- ========== STORAGE POLICIES ==========
CREATE POLICY media_read_signed_in ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'media');
CREATE POLICY media_insert_own ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY media_delete_own ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ========== REALTIME ==========
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
