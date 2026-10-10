# 🎂 Birthday Twin

A social discovery web app for finding people around the world who share your birthday — and seeing how differently lives unfold from the same starting day.

Birthday Twin is about curiosity and community, not dating. Connections and messaging are optional and controlled by each user.

## 🌐 Live Demo

[Try Birthday Twin](https://twin-birthdays-unite.lovable.app) — https://twin-birthdays-unite.lovable.app

Source code: [github.com/uh1001/birthday-twins](https://github.com/uh1001/birthday-twins)

## ✨ Implemented Features

- **Birthday Twins & Year Twins** — matching on month + day, and month + day + year (birth year stays private and is matched server-side). Feb 29 birthdays are supported.
- **Onboarding** — name, username, birthday, optional private birth year, photo upload, city/country, occupation, interests, bio and privacy choices, followed by a "We found your Birthday Twins" reveal.
- **Home** — greeting, birthday countdown, Birthday Twins, Today's Journey, Daily Birthday Question and community moments.
- **Birthday Communities** — per-birthday feed, members with country/age/interest filters, daily question answers, events with RSVPs, and challenges.
- **Moments** — text, photo and short-video posts with city/country, likes, comments, saves and post detail pages.
- **Explore & World Map** — search, Year Twins, countries and celebrity birthday matches; map shows country-level counts only.
- **Profiles** — birthday card, Birthday/Year Twin badges, posts, moments, connections; age and location shown only if the user allows it.
- **Connections & Messaging** — connection requests, direct messages with read indicators, block and report.
- **Notifications** — connections, messages, comments, reactions, community events and birthday notices, with per-category preferences.
- **XP & Ranks** — points awarded by the database for meaningful actions, with daily caps.
- **Shareable Birthday Twin card** and **Yearbook**.
- **Privacy & safety** — private profiles, messaging permissions, blocks, reports and account deletion.
- **Moderation** — role-based moderator page (only visible to moderators) to review reported posts, comments and profiles; dismiss/resolve reports or remove content; create, edit and delete community challenges. Every moderator action is logged with moderator, action, time and reason.

## ✅ What Has Been Verified

- Ordinary accounts are refused by the database when trying moderator actions, reading reports or the moderation log, or granting themselves roles (tested with a temporary account).
- The owner moderator account can open the moderation page and create/delete a challenge, with both actions appearing in the log.
- Full report flow: a temporary account posted, a second ordinary account reported it, the reporter's attempt to remove it was refused, and the moderator account removed it. The post was deleted, the report marked resolved, and a `remove_post` log entry recorded the moderator, time and reason. Test accounts and data were then deleted; the log entry was kept.
- Posting, likes, comments and XP were exercised in the preview during development.
- Birthday / leap-year and XP helper unit tests (`src/lib/*.test.ts`).

Other features are implemented but have not each been tested end to end.

## ⚠️ Current Limitations

- Daily questions come from a seeded list; once it runs out, the latest question repeats.
- Celebrity matches use a small built-in list, structured so an external API can be connected later.
- Map country outlines are loaded from an external public source.
- Demo users are fake profiles used to show matching; they cannot sign in.
- Moderators can't yet suspend accounts; there's no appeal flow.

## 🛠️ Tech Stack

- React 19 + TypeScript
- TanStack Start (TanStack Router, server functions) on Vite
- TanStack Query
- Tailwind CSS v4 + shadcn/ui (Radix UI)
- Lovable Cloud (Supabase: Postgres with row-level security, Auth, Storage)
- Vitest

## 🚀 Running Locally

Requires [Bun](https://bun.sh) (the repo has a `bun.lock`) or Node.js with npm.

```bash
git clone https://github.com/uh1001/birthday-twins.git
cd birthday-twins
bun install        # or: npm install
bun run dev        # or: npm run dev
```

The app reads its backend settings from `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`), which Lovable manages. These are publishable values; never commit service-role keys or other private credentials.

Other scripts: `bun run build`, `bun run lint`, `bunx vitest run`.

Database schema changes live in `drizzle/migrations/` and `supabase/migrations/`.

## 🤖 Development with Lovable

Birthday Twin is built with [Lovable](https://lovable.dev), an AI app builder, and synced to GitHub. Changes made in Lovable are pushed to this repository, and commits pushed here sync back into Lovable. The backend (database, auth, storage) runs on Lovable Cloud.

## 💡 Why I Built It

I wanted to explore how sharing a birthday could become a starting point for discovering people and their experiences.

## 👤 Creator

**Usman Haider**

- GitHub: [uh1001](https://github.com/uh1001)
- LinkedIn: [Usman Haider](https://www.linkedin.com/in/usman-haider-1088bb37b/)
