# Birthday Twins

Can you build a social app Build a polished, modern social discovery app called “Birthday Twin.”

PRODUCT VISION

Birthday Twin is a social discovery platform that helps people discover and connect with people around the world who share their birthday.

The philosophy of the app is:

“Discover life through people who share your birthday.”

This is NOT a dating app and should not feel like Instagram, TikTok, or a dating platform. The emphasis should be on curiosity, shared experiences, community, and discovering how people born on the same day live different lives around the world.

The most important moment in the app should be when a new user enters their birthday and immediately discovers their Birthday Twins.

CORE USER FLOW

1. User lands on a beautiful Birthday Twin welcome page.

2. User creates an account or signs in.

3. During onboarding, collect:

   - First name

   - Username

   - Birthday

   - Birth year (optional/private)

   - Profile photo

   - City/country

   - Occupation or student status

   - Interests

   - Short bio

4. After onboarding, immediately show:

   “We found your Birthday Twins 🎂”

5. Display people who share the exact same month and day.

6. Allow the user to explore their profiles, follow/connect with them, view posts, and message them.

7. Bring the user into their Birthday Community.

BIRTHDAY MATCHING

Birthday matching is the core feature.

Create different match types:

Birthday Twin:

Same month and day.

Year Twin:

Same month, day, and year.

Birthday Community:

Everyone who shares that month and day.

Show interesting statistics such as:

“You share your birthday with 2,847 people on Birthday Twin.”

“Your Birthday Twins live in 37 countries.”

“124 Birthday Twins are the same age as you.”

Create a prominent “Find My Birthday Twins” experience.

HOME SCREEN

Create a personalized Home feed.

At the top show:

“Good morning, [First Name]”

“Your birthday is in ___ days.”

Include sections such as:

- Birthday Twins

- Moments from your Birthday Community

- Today’s Journey

- Daily Birthday Question

- Birthday Twin activity

- People around the world

The feed should prioritize people who share the user's birthday rather than generic viral content.

BIRTHDAY COMMUNITY

Every birthday should have its own community.

Example:

September 19 Community

🎂 September 19

🌎 Members around the world

Inside the community users can:

- Post text

- Upload photos

- Upload short videos

- Answer daily questions

- Comment

- Like/react

- Discover members

- Filter by country

- Filter by age range

- Filter by interests

DAILY BIRTHDAY QUESTION

Create one community question each day.

Examples:

“What is something you want to accomplish before your next birthday?”

“What is your favorite birthday memory?”

“What career did you think you would have when you were younger?”

Users can answer and browse answers from their Birthday Twins.

This should encourage meaningful conversations rather than engagement bait.

TODAY’S JOURNEY

Create a storytelling feature called “Today’s Journey.”

Show selected Birthday Twins from different parts of the world and small snapshots of their lives.

Example:

“Your Birthday Twins Today”

A student in Texas

A designer in Tokyo

A teacher in London

A software engineer in Pakistan

The purpose is to show how people born on the same day can live completely different lives.

EXPLORE

Create an Explore page where users can discover:

- Birthday Twins

- Year Twins

- People in different countries

- Birthday communities

- Trending community questions

- Interesting profiles

- Celebrity birthday matches

Include search and filters.

WORLD MAP

Create an interactive Birthday Twin world map.

Show countries where the user's Birthday Twins are located.

Example:

“Your Birthday Twins Around the World”

Allow users to tap a country and see Birthday Twins from that country.

Do NOT expose precise user locations. Only show broad city/country information users have chosen to make public.

PROFILES

Profiles should contain:

Profile photo

Name

Username

Birthday

Optional age

City/country

Occupation

Bio

Interests

Birthday Twin badge

Year Twin badge when applicable

Posts

Moments

Connections

Include a visually appealing birthday card near the top of each profile.

Example:

🎂 September 19

“Birthday Twin”

MESSAGING

Create private messaging between users.

Include:

Conversation list

Direct messages

Message timestamps

Read indicators

Profile preview

Block/report options

Design messaging to feel clean and simple.

MOMENTS

Create “Moments,” where users can post small updates from their life.

Moments can contain:

Text

Photo

Short video

Location at country/city level

Caption

The idea is to let someone see:

“What are people who share my birthday doing today?”

CONNECTIONS

Users should be able to:

Connect

Follow

Remove connection

Block

Report

Show mutual Birthday Twin connections when relevant.

GAMIFICATION

Add a lightweight XP system that rewards meaningful participation.

XP can be earned for:

Completing profile

Answering daily questions

Posting Moments

Making connections

Participating in the Birthday Community

Create tasteful rank/badge progression.

Do NOT make the gamification childish or overwhelming.

NOTIFICATIONS

Create notifications for:

New Birthday Twin discovered

Connection requests

Messages

Comments

Reactions

Community activity

Birthday countdown milestones

Birthdays

CELEBRITY BIRTHDAY MATCHES

Create a section that can eventually display famous people who share the user's birthday.

Design this feature so celebrity data can later be connected through an API.

SHARING

Create beautiful shareable Birthday Twin cards.

Example:

“I found my Birthday Twins 🎂

September 19

2,847 people

37 countries

Birthday Twin”

These cards should be designed for sharing on Instagram Stories, Snapchat, Messages, etc.

NAVIGATION

Use a mobile-first bottom navigation bar:

Home

Community

Explore

Messages

Profile

DESIGN SYSTEM

The design should feel premium, warm, social, and modern.

Visual inspiration:

- Apple-style simplicity

- Modern startup design

- Soft rounded cards

- Lots of whitespace

- Subtle shadows

- Smooth animations

- Clean typography

Primary brand direction:

Warm orange + white.

Orange should represent birthdays, warmth, excitement, and connection.

Avoid making the interface overly colorful.

Use:

- White backgrounds

- Warm orange accents

- Dark readable typography

- Rounded buttons

- Rounded profile images/cards

- Subtle gradients where appropriate

Make the interface feel like a real venture-backed consumer social app rather than a school project.

RESPONSIVE DESIGN

Build mobile-first but make the website responsive for:

Mobile

Tablet

Desktop

On desktop, intelligently adapt the mobile navigation into a sidebar or appropriate web navigation.

BACKEND

Use Supabase.

Implement:

Authentication

User profiles

Birthday matching

Posts

Comments

Likes/reactions

Connections

Messages

Notifications

Community memberships

Daily questions

Answers

XP

User settings

Create a clean relational database schema.

IMPORTANT PRIVACY REQUIREMENTS

Birth year should be optional/private.

Users should control whether their age is visible.

Do not expose exact addresses.

Location should only display city/country when the user chooses to make it visible.

Include:

Block user

Report user

Private profile option

Messaging permissions

Account deletion

Privacy settings

AUTHENTICATION

Support:

Email/password signup

Login

Forgot password

Email verification

Design the authentication pages to match the Birthday Twin branding.

EMPTY STATES

Do not leave pages looking unfinished when there is no data.

Create polished empty states.

Example:

“No Moments yet.

Your Birthday Twins are probably doing something interesting right now. Be the first to share yours.”

DEMO DATA

Populate the development version with realistic fake users from different countries, occupations, ages, and interests so the Birthday Twin concept is immediately understandable when testing the app.

Create sample users who share the same birthday so matching, communities, profiles, posts, and messaging can be demonstrated.

TECHNICAL QUALITY

Use reusable components.

Keep the codebase organized and scalable.

Create clear database types/models.

Implement loading states, error states, skeleton loaders, form validation, and responsive layouts.

Do not use placeholder pages for major features.

The initial build should feel like a functional MVP of a real social platform.

MOST IMPORTANT PRIORITY

The emotional “wow” moment of Birthday Twin is:

“I wonder what people who were born on the same day as me are doing with their lives.”

Everything in the product should reinforce that feeling of curiosity and connection.

A new user should be able to sign up, enter their birthday, and discover interesting Birthday Twins within a few minutes.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e1e579af-2bfb-52bd-acad-1d8addcfb548).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
