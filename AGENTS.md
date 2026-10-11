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

- Browser writes are limited by column-level GRANTs (profiles: name/avatar; analyses: is_saved; data_preferences: history/retention; alerts: read_at); all other writes go through server functions with the service role — so plan, usage and results cannot be tampered with client-side.
- Monthly usage is reserved atomically via the `reserve_analysis_usage` DB function (service role only) before analysis and released on failure — never count-then-insert in app code, which races.
- Account deletion goes through `delete_user_data` (service role) then the auth admin API; this month's usage is carried over by hashed email so re-registering can't reset limits.
- Retention runs hourly in the database (`purge_expired_analyses` via pg_cron); image files can't be deleted from SQL, so paths are queued in `pending_storage_deletions` and removed by the server on app activity.
- Keep unverified social sign-in entry points out of AuthCard even when the hosted provider is enabled; configuration alone does not prove the end-to-end flow works.
- Derive report assessment labels from the saved provider, including plain-text downloads; fallback results must not be presented as AI-produced.
- Normalize URL verdicts in the risk engine against retained warning severity and replace unsupported lookup advice before saving, so results and reports share the same honest assessment.
