# Schemantics

GA4 analytics schema management tool. Define events and parameters, document scope and GTM send-to behaviour, and auto-generate a wiki with dataLayer implementation snippets.

## Running locally

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
git clone https://github.com/stefandezarn/project-skimaster
cd project-skimaster
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000).

## What it does

- **Events** — define GA4 events with parameters, categories, and descriptions
- **Parameters** — maintain a global parameter library with type, scope, and GTM send-to definitions
- **Wiki** — auto-generated markdown docs per event including dataLayer.push() snippets with correct ecommerce object hierarchy
- **Export** — download the workspace as JSON, markdown, MkDocs zip, Docusaurus zip, or CSV data dictionary
- **GA4 templates** — apply Google's recommended event definitions as a starting point

## Tech stack

- **Frontend:** React 19, Tailwind CSS
- **Backend:** Python, FastAPI, file-based JSON storage
- **Infrastructure:** Docker Compose
