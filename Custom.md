# Customizations

Customize the look and feel of the frontend via the below locations.

| Change Type | Where to edit | Notes |
| --- | --- | --- |
| Text on homepage, buttons, headings, forms, dynamic content | `+page.svelte` (or other route components) | Svelte syntax, reactive variables |
| Admin‑page messages, lists, etc. | `+page.svelte` | |
| Global layout, nav bars, footers | add/edit `+layout.svelte` or components under `src/lib` | |
| A new “hero image” or other static asset |	put file under <static> and reference it in Svelte markup | |	
| Global HTML shell, favicon, body class |	app.html	| |
| Local dev‑only tweaks (e.g. proxy to vite server) |	dev.html (not used in prod) | |


Once you’ve edited any of the Svelte/HTML files, rebuild the frontend and then the Go binary (via `docker buildx` or your normal build command) to package the updates.
