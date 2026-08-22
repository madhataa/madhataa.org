# madhataa.org

Static site for the MaD-HaTTeRs worldwide meeting. The page is entirely client-side: all clocks, countdowns, emoji flourishes, themes, and social previews are generated in the browser with zero backend dependencies.

## Architecture

- **Hosting**: [GitHub Pages](https://pages.github.com/), served from the root of the `main` branch.
- **Custom domain**: `madhataa.org` (declared by the `CNAME` file in the repo root and by the Pages settings).
- **DNS / SSL**: Cloudflare (or your DNS provider) in **Full (strict)** SSL mode; records are managed manually.
- **Assets**: Generated OG card, favicons, and icons stored at the repo root.

## Features

- **Live timezone grid** driven by the `zones` array inside `index.html`.
- **Local countdown** that continuously recalculates the next 10:30 AM GMT session and mirrors it in the visitor's timezone.
- **Dark / light mode toggle** with `localStorage` persistence.
- **Low-effects guard** that disables the second ticker and emoji animation for devices that report reduced motion, low memory (`≤2 GB`), or Data Saver.
- **Canvas particles + emoji marquee** for higher-end devices to keep the hero lively.
- **Social metadata** (Open Graph, Twitter card, manifest) so the page shares cleanly everywhere.

## Anonymous GitHub account (required)

This project lives on its own dedicated GitHub account. It should not be tied to a real name, personal email, or other identifying details.

1. Create a new GitHub account with a username such as `madhataa`, `madhataa-org`, or another pseudonym. Use an email created for this purpose (a forwarding alias or the account's `@users.noreply.github.com` address is fine).
2. Create a new **empty** public repository named `madhataa.org` on that account. Do not initialize it with a README or license.
3. Update the local Git remote:
   ```bash
   git remote set-url origin https://github.com/madhataa/madhataa.org.git
   ```
4. Configure the local git identity for this repo so future commits stay anonymous:
   ```bash
   git config user.name "MaD-HaTTeRs Web"
   git config user.email "madhataa@users.noreply.github.com"
   ```

   If the new account has **Keep my email addresses private** enabled, GitHub will give you an ID-based address like `1234567+madhataa@users.noreply.github.com` in your email settings. Use that exact form instead.

5. The existing commit history currently contains a real name and personal email. To remove them before pushing, see **Anonymising the history** below.
6. Push:
   ```bash
   git push -u origin main
   ```

## GitHub Pages setup

1. In the new repo's **Settings → Pages**:
   - **Source**: **Deploy from a branch** → `main` / root.
   - **Custom domain**: `madhataa.org`.
   - Leave **Enforce HTTPS** checked. Cloudflare will handle the TLS edge certificate.
2. GitHub will detect the `CNAME` file and issue a certificate for `madhataa.org` and `www.madhataa.org`.

## DNS (Cloudflare)

If you are using Cloudflare for `madhataa.org`:

1. Create a CNAME for the apex (`@`) pointing to `madhataa.github.io`. Cloudflare's CNAME flattening makes a `CNAME` at the apex valid.
2. Create a CNAME for `www` pointing to `madhataa.github.io`.
3. Set **SSL/TLS → Overview** to **Full (strict)**. GitHub Pages serves a valid CA-signed certificate, so Cloudflare can verify the origin.

If you use another DNS provider, create equivalent CNAME records. Some providers do not allow a CNAME at the apex; in that case use an ALIAS/ANAME record or an A record to GitHub Pages' IPs.

## Development

1. Edit `index.html` and `styles.css` as needed.
2. Test locally with any static server, for example:
   ```bash
   python3 -m http.server 8000
   ```
3. Commit and push to `main`. GitHub Pages will update automatically.

## Asset generation

The `tools/` scripts regenerate favicons and the OG image:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install Pillow
python tools/gen_icons.py
python tools/gen_og_image.py
```

## Anonymising the history

The simplest way to strip the old real-name author / email from all commits is to use `git filter-repo` or `git filter-branch`. **This rewrites every commit hash, so back the repository up first.**

```bash
# Using git-filter-repo (recommended; install if needed)
git filter-repo --name-callback 'return b"MaD-HaTTeRs Web"' \
                --email-callback 'return b"madhataa@users.noreply.github.com"' --force

# Or, with the built-in git filter-branch:
git filter-branch --env-filter '
    export GIT_AUTHOR_NAME="MaD-HaTTeRs Web"
    export GIT_AUTHOR_EMAIL="madhataa@users.noreply.github.com"
    export GIT_COMMITTER_NAME="MaD-HaTTeRs Web"
    export GIT_COMMITTER_EMAIL="madhataa@users.noreply.github.com"
' --tag-name-filter cat -- --all
```

After rewriting, push to the new remote with:

```bash
git push --force-with-lease origin main
```

## Legacy scripts

`deploy.sh`, `deploy.ps1`, and `setup_cloudflare.sh` are from the previous AWS S3 + curl-based Cloudflare setup. They are not needed for the GitHub Pages + Terraform workflow and are kept only until the migration is fully verified.

## License

All code, assets, and documentation in this repository are released under [The Unlicense](LICENSE), meaning anyone can do anything with it. For the legal text see `LICENSE` or visit <https://unlicense.org/>.
