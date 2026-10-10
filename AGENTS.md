<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Private birth year and location live in `profile_private` (owner-only); DB triggers mask the public `profiles` columns from visibility flags — never expose private values from client code.
- XP is awarded only by database triggers via `award_xp` (deduped per action/ref, daily caps); clients never write `profiles.xp`.
- Notifications for others are created by database triggers through `notify`, which honours `notification_prefs` and blocks.
- RLS visibility uses cached array helpers (`my_hidden_ids`, `my_private_hidden_ids`) — avoid per-row function calls in policies; they time out on large tables.
- Community-scoped queries resolve member IDs first (`communityIds`) instead of `profiles!inner` filters, which time out.
- Uploaded media goes to the private `media` bucket in the user's own folder and is stored as a long-lived signed URL (public buckets are blocked in this workspace).
- Moderator access comes from `user_roles` via `has_role`/`is_moderator`.
