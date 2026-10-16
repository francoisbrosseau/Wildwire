# Reader account setup

The static account page is wired for Supabase Auth and a `saved_articles` table. Guest favorites continue to work. The project config is ready locally; production account use still needs the auth redirect settings and an approved deployment.

## What is ready

The static account page and client integration are prepared. The database migration is applied and verified; row-level security allows each signed-in reader to read, add and remove only their own saved-article rows. No reader registration or cloud-sync test has been performed on the live site.

## What the owner needs to do

The connected Supabase account lists the healthy `WILDWIRE` project. Its public Project URL and publishable key are configured locally in `js/supabase-config.js`. Do not send a database password or secret key in chat or put a secret key in the website.

The Project URL and publishable key are available in the project's **Connect** dialog or **Settings → API Keys**. These are intended to be public in browser code. Never use a `service_role` or secret key in browser code or commit it to GitHub.

The saved-articles migration has been applied to this project and verified. It creates `public.saved_articles`, enables row-level security, and allows authenticated readers to access only their own rows. Set up redirects:

1. In **Authentication → URL Configuration**, set **Site URL** to `https://wildwiremag.com`.
2. Add these exact **Redirect URLs** so signup confirmation and recovery can return to the account page on both hostnames and the old Pages URL:
   - `https://wildwiremag.com/account.html`
   - `https://wildwiremag.com/account.html?mode=reset`
   - `https://www.wildwiremag.com/account.html`
   - `https://www.wildwiremag.com/account.html?mode=reset`
   - `https://francoisbrosseau.github.io/Wildwire/account.html`
   - `https://francoisbrosseau.github.io/Wildwire/account.html?mode=reset`
3. In **Authentication → Providers → Email**, keep email confirmation enabled. The app uses the Site URL/allowed redirects for confirmation and password recovery. For dependable delivery beyond low-volume testing, configure a custom SMTP sender; review any provider charges before enabling it. Google sign-in is optional and needs a Google OAuth client.
4. Test confirmation, login, recovery, guest-favorite merge and removal in the deployed site, then verify saved stories from a second browser/device before calling account sync live.

Namecheap DNS controls are still unavailable here. The owner reports GitHub Pages' DNS check succeeded; public DNS, HTTPS, and redirects have not been independently verified. Supabase auth redirect allowlisting is still required before account flows can be considered ready.
