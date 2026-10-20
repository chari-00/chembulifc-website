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
- All site data (events, forms, registrations, gallery, blog posts) goes through `src/lib/store.ts` (`useDB`/`useLiveEvents`/`update`); it is browser storage for now so it can be swapped for the planned Appwrite backend in one place.
- Registration submission uses `addRegistration` in the store to validate current event availability and allocate a tournament-unique reference alongside the write.
- Payment screenshots are validated compact image data stored on registrations through `addRegistration`, so payment evidence follows the same replaceable storage boundary as team details.
- Blog posts use ordered heading/text/image blocks, with admin-only editor routes under the existing admin layout; publication filters live in `src/data/blog.ts` so drafts stay out of public views.
- Event status is derived by `eventStatus()` in `src/data/events.ts`, never stored, so past events become completed automatically.
- Admin sign-in in `src/routes/admin.tsx` is a temporary browser-side check; replace with backend auth before going live.
