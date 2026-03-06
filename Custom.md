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


Once you’ve edited any of the Svelte/HTML files, rebuild the frontend and then the Go binary (via `docker buildx build -t quickfood-local:latest --load .` in Project root) to package the updates.



# Shortcuts

## Build
To build, create, start the resources in docker compose file.
```
QUICKPIZZA_IMAGE=quickfood-local:latest docker compose -f compose.grafana-cloud.microservices.yaml up -d
```

## Stop and Remove
To stop and remove containers, networks and other resources.
```
docker compose -f compose.grafana-cloud.microservices.yaml down
```

# 1. PURGE everything
```
docker compose down -v
docker rmi quickfood-local:latest
docker image prune -af
docker builder prune -af
```


# 2. REBUILD from scratch
```
docker buildx build -t quickfood-local:latest --load .
```

# 3. START fresh  
```
QUICKPIZZA_IMAGE=quickfood-local:latest docker compose -f compose.grafana-cloud.microservices.yaml up -d
```


# 4. TEST the API
```
curl -X POST http://localhost:3333/api/food \
  -H "Authorization: Token abcdef0123456789" \
  -H "Content-Type: application/json" \
  -d '{"maxCaloriesPerSlice": 1000, "mustBeVegetarian": false}'
```


# 5. RUN a k6 test if you want to verify load tests work
```
k6 run k6/foundations/14.basic.tracing.js -u http://localhost:3333
```
