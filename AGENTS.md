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
