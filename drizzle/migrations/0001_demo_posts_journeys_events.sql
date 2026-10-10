
UPDATE public.moments SET kind = 'post', image_url = 'https://picsum.photos/seed/' || substr(id::text, 1, 8) || '/900/700', media_type = 'image'
WHERE ('x' || substr(md5(id::text), 1, 2))::bit(8)::int < 70;

UPDATE public.moments SET kind = 'post',
  video_url = (ARRAY['https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4','https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4'])[1 + (('x' || substr(md5(id::text), 3, 2))::bit(8)::int % 2)],
  media_type = 'video', image_url = NULL
WHERE ('x' || substr(md5(id::text), 1, 2))::bit(8)::int BETWEEN 70 AND 85;

INSERT INTO public.moments (profile_id, body, kind, city, country, created_at, image_url, media_type)
SELECT p.id, j.body, 'journey', p.city, p.country,
  date_trunc('day', now()) + j.at,
  CASE WHEN j.photo THEN 'https://picsum.photos/seed/j' || substr(p.id::text, 1, 6) || j.n || '/900/700' END,
  CASE WHEN j.photo THEN 'image' END
FROM public.profiles p
CROSS JOIN (VALUES
  (1, interval '7 hours 15 minutes', 'Morning: coffee, a quick walk and a look at the plan for today.', false),
  (2, interval '12 hours 40 minutes', 'Lunch break — this is the view from where I am right now.', true),
  (3, interval '18 hours 5 minutes', 'Evening wind-down. Small wins today, grateful for them.', false)
) AS j(n, at, body, photo)
WHERE p.is_demo AND ('x' || substr(md5(p.id::text), 5, 2))::bit(8)::int < 90;

INSERT INTO public.community_events (birth_month, birth_day, title, description, location, starts_at, created_by)
SELECT DISTINCT ON (birth_month, birth_day) birth_month, birth_day,
  'Birthday twins video hangout',
  'An informal online meetup for everyone born on this day. Bring a story from the past year.',
  'Online', now() + interval '9 days', id
FROM public.profiles WHERE is_demo AND birth_month IS NOT NULL
ORDER BY birth_month, birth_day, xp DESC;
