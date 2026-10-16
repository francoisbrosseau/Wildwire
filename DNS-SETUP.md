# WildWireMag.com DNS setup

The primary hostname is `wildwiremag.com`; GitHub Pages should redirect `www` to the apex once both are configured.

Namecheap DNS cannot be edited through the connected tools in this workspace. In Namecheap, open **Domain List → Manage** beside `wildwiremag.com` → **Advanced DNS → Host Records**. If the Host Records section is missing, the domain uses external nameservers; make these same DNS changes at the provider shown under **Domain → Nameservers** instead.

1. Once the reviewed site update is ready, set the custom domain to `wildwiremag.com` in the GitHub repository **Settings → Pages** and save it. GitHub recommends registering the custom domain in Pages before changing DNS.
2. In Namecheap **Advanced DNS**, remove conflicting parking/URL-redirect entries and any conflicting apex A/AAAA or `www` records. Add these records:

| Type | Host | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| AAAA | @ | 2606:50c0:8000::153 |
| AAAA | @ | 2606:50c0:8001::153 |
| AAAA | @ | 2606:50c0:8002::153 |
| AAAA | @ | 2606:50c0:8003::153 |
| CNAME | www | francoisbrosseau.github.io |

Remove conflicting apex A/AAAA, forwarding records, and any `www` A/AAAA or CNAME records before adding these. Do not point `www` to the repository path. Leave DNSSEC enabled only if the registrar's DNS provider is serving the matching records.

Set each record's TTL to **Automatic**. Do not add a URL Redirect record for `www`; the `www` CNAME lets GitHub Pages issue the redirect to the apex hostname.

3. Wait for DNS propagation, confirm both hostnames resolve, then in repository Settings → Pages enable **Enforce HTTPS** after GitHub issues the certificate. Certificate issuance may take up to 24 hours.
4. Verify `https://wildwiremag.com`, `https://www.wildwiremag.com`, and the existing project URL `https://francoisbrosseau.github.io/Wildwire/` after deployment. Confirm assets and account links on both desktop and mobile.

The repository CNAME file contains `wildwiremag.com`. No registrar records or Pages custom-domain setting have been changed yet. GitHub documents these records and the order above at https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site.
