
-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE,
  first_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  birth_month INT,
  birth_day INT,
  birth_year INT,
  show_age BOOLEAN NOT NULL DEFAULT true,
  is_private BOOLEAN NOT NULL DEFAULT false,
  allow_messages BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  city TEXT,
  country TEXT,
  country_code TEXT,
  occupation TEXT,
  interests TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT,
  xp INT NOT NULL DEFAULT 0,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX profiles_birthday_idx ON public.profiles (birth_month, birth_day);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- MOMENTS
CREATE TABLE public.moments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  city TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX moments_profile_idx ON public.moments (profile_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.moments TO authenticated;
GRANT SELECT ON public.moments TO anon;
GRANT ALL ON public.moments TO service_role;
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moments_public_read" ON public.moments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "moments_write_own" ON public.moments FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id()) WITH CHECK (profile_id = public.current_profile_id());

-- COMMENTS
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  moment_id UUID NOT NULL REFERENCES public.moments(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX comments_moment_idx ON public.comments (moment_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT ON public.comments TO anon;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_public_read" ON public.comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "comments_write_own" ON public.comments FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id()) WITH CHECK (profile_id = public.current_profile_id());

-- LIKES
CREATE TABLE public.likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  moment_id UUID NOT NULL REFERENCES public.moments(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (moment_id, profile_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.likes TO authenticated;
GRANT SELECT ON public.likes TO anon;
GRANT ALL ON public.likes TO service_role;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_public_read" ON public.likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "likes_write_own" ON public.likes FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id()) WITH CHECK (profile_id = public.current_profile_id());

-- CONNECTIONS
CREATE TABLE public.connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connections TO authenticated;
GRANT SELECT ON public.connections TO anon;
GRANT ALL ON public.connections TO service_role;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "connections_public_read" ON public.connections FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "connections_write_own" ON public.connections FOR ALL TO authenticated
  USING (follower_id = public.current_profile_id()) WITH CHECK (follower_id = public.current_profile_id());

-- MESSAGES
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX messages_pair_idx ON public.messages (sender_id, recipient_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_read_participants" ON public.messages FOR SELECT TO authenticated
  USING (sender_id = public.current_profile_id() OR recipient_id = public.current_profile_id());
CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = public.current_profile_id());
CREATE POLICY "messages_update_participants" ON public.messages FOR UPDATE TO authenticated
  USING (sender_id = public.current_profile_id() OR recipient_id = public.current_profile_id())
  WITH CHECK (sender_id = public.current_profile_id() OR recipient_id = public.current_profile_id());
CREATE POLICY "messages_delete_own" ON public.messages FOR DELETE TO authenticated
  USING (sender_id = public.current_profile_id());

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own" ON public.notifications FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id()) WITH CHECK (profile_id = public.current_profile_id());

-- DAILY QUESTIONS
CREATE TABLE public.daily_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ask_date DATE NOT NULL UNIQUE,
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_questions TO anon, authenticated;
GRANT ALL ON public.daily_questions TO service_role;
ALTER TABLE public.daily_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_public_read" ON public.daily_questions FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.daily_questions(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, profile_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.answers TO authenticated;
GRANT SELECT ON public.answers TO anon;
GRANT ALL ON public.answers TO service_role;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answers_public_read" ON public.answers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "answers_write_own" ON public.answers FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id()) WITH CHECK (profile_id = public.current_profile_id());

-- BLOCKS / REPORTS
CREATE TABLE public.blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks_own" ON public.blocks FOR ALL TO authenticated
  USING (blocker_id = public.current_profile_id()) WITH CHECK (blocker_id = public.current_profile_id());

CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_insert_own" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = public.current_profile_id());
CREATE POLICY "reports_read_own" ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = public.current_profile_id());

-- DEMO DATA ---------------------------------------------------------------
INSERT INTO public.daily_questions (ask_date, question)
SELECT (CURRENT_DATE - (i || ' days')::interval)::date,
  (ARRAY[
   'What is something you want to accomplish before your next birthday?',
   'What is your favorite birthday memory?',
   'What career did you think you would have when you were younger?',
   'What does a normal Tuesday look like where you live?',
   'What is one thing people always get wrong about your country?',
   'What small thing made you happy this week?',
   'If you could spend your next birthday anywhere, where would it be?',
   'What is a skill you picked up in the last year?',
   'What song always takes you back to being 15?',
   'What is the best meal you have eaten this month?',
   'Who taught you something important this year?',
   'What are you most curious about right now?',
   'What would you tell yourself one birthday ago?',
   'What is a tradition your family has that you love?'
  ])[i + 1]
FROM generate_series(0, 13) i;

WITH days AS (
  SELECT EXTRACT(MONTH FROM d)::int AS m, EXTRACT(DAY FROM d)::int AS dd
  FROM generate_series('2024-01-01'::date, '2024-12-31'::date, '1 day') d
), n AS (SELECT generate_series(1,5) AS k),
base AS (
  SELECT m, dd, k, (m * 41 + dd * 7 + k * 13) AS h FROM days, n
)
INSERT INTO public.profiles
  (first_name, username, birth_month, birth_day, birth_year, avatar_url, city, country, country_code, occupation, interests, bio, xp, is_demo, onboarded)
SELECT
  fn,
  lower(fn) || '_' || m || dd || k,
  m, dd,
  1972 + (h % 34),
  'https://i.pravatar.cc/300?img=' || (1 + (h % 70)),
  split_part(loc, '|', 1), split_part(loc, '|', 2), split_part(loc, '|', 3),
  occ,
  ARRAY[
    (ARRAY['Photography','Running','Cooking','Cinema','Hiking','Chess','Gardening','Vinyl records'])[1 + (h % 8)],
    (ARRAY['Travel','Coffee','Football','Painting','Astronomy','Languages','Baking','Surfing'])[1 + ((h / 3) % 8)],
    (ARRAY['Books','Cycling','Street food','Design','Podcasts','Volunteering','Dogs','Live music'])[1 + ((h / 5) % 8)]
  ],
  fn || ' — ' || occ || ' in ' || split_part(loc, '|', 1) || '. ' ||
    (ARRAY[
      'Chasing small adventures between long work weeks.',
      'Somewhere between early mornings and late-night plans.',
      'Collecting stories from people born on the same day as me.',
      'Trying to make one good thing every day.',
      'Happiest with a full table and slow conversation.'
    ])[1 + (h % 5)],
  40 + (h % 900),
  true, true
FROM (
  SELECT m, dd, k, h,
    (ARRAY['Maya','Liam','Sofia','Arjun','Nora','Diego','Yuki','Amara','Tom','Elif','Lucas','Chiara','Noah','Aisha','Mateo','Hana','Ivan','Leila','Ben','Zara','Oscar','Priya','Kofi','Ines'])[1 + (h % 24)] AS fn,
    (ARRAY[
      'Austin|United States|US','Tokyo|Japan|JP','London|United Kingdom|GB','Lahore|Pakistan|PK','Lagos|Nigeria|NG',
      'São Paulo|Brazil|BR','Berlin|Germany|DE','Mumbai|India|IN','Toronto|Canada|CA','Seoul|South Korea|KR',
      'Nairobi|Kenya|KE','Mexico City|Mexico|MX','Paris|France|FR','Sydney|Australia|AU','Istanbul|Türkiye|TR',
      'Cairo|Egypt|EG','Stockholm|Sweden|SE','Buenos Aires|Argentina|AR','Manila|Philippines|PH','Lisbon|Portugal|PT',
      'Warsaw|Poland|PL','Jakarta|Indonesia|ID','Milan|Italy|IT','Cape Town|South Africa|ZA'
    ])[1 + ((h / 2) % 24)] AS loc,
    (ARRAY['Student','Software engineer','Teacher','Nurse','Graphic designer','Barista','Architect','Photographer','Chef','Electrician','Marine biologist','Musician','Pharmacist','Data analyst','Carpenter','Flight attendant','Illustrator','Physiotherapist'])[1 + ((h / 4) % 18)] AS occ
  FROM base
) s;

INSERT INTO public.moments (profile_id, body, city, country, created_at)
SELECT p.id,
  (ARRAY[
    'Woke up at 5am to catch the light over the city. Worth it.',
    'Made my grandmother''s recipe for the first time without calling her.',
    'Finished a 10k today. Slowly getting better at this.',
    'Rainy afternoon, good coffee, nothing to prove.',
    'First day at the new job. Nervous in a good way.',
    'Found a bookshop that stays open until midnight. Dangerous.',
    'Trying to learn guitar again at my age. Fingers hurt.',
    'Market day. Bought far too many tomatoes.',
    'Long train ride home, watching the country go past.',
    'Someone with my exact birthday lives three time zones away. Wild.'
  ])[1 + (abs(hashtext(p.id::text)) % 10)],
  p.city, p.country,
  now() - ((abs(hashtext(p.id::text)) % 240) || ' hours')::interval
FROM public.profiles p
WHERE p.is_demo AND (abs(hashtext(p.username)) % 2) = 0;

INSERT INTO public.answers (question_id, profile_id, body)
SELECT q.id, p.id,
  (ARRAY[
    'Learn to swim properly. I have been putting it off for a decade.',
    'My tenth birthday — my dad made a cake shaped like a boat.',
    'I was completely sure I would be an astronaut.',
    'Save enough to take my mum on the trip she keeps talking about.',
    'Finally finish the book I started three years ago.',
    'Move somewhere with a sea view, even a small one.'
  ])[1 + (abs(hashtext(p.id::text || q.id::text)) % 6)]
FROM public.daily_questions q
JOIN LATERAL (
  SELECT id FROM public.profiles
  WHERE is_demo AND (abs(hashtext(username)) % 7) = 0
  ORDER BY md5(username || q.id::text) LIMIT 60
) p ON true
WHERE q.ask_date > CURRENT_DATE - 4;
