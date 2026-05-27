Deployment & Making the app public

Goal: make the app accessible on the internet and fully functional.

Quick options:

- Docker (recommended): build the included `Dockerfile` and run the container. The container serves the frontend `dist/` and the backend API on `PORT` (default `3000`).
- Cloud platforms: Render, Railway, Heroku, or Vercel. For simple single-service deploy use Render/Railway with the Dockerfile or `npm start`.
- Frontend-only: Deploy the Vite `dist` to Vercel/Netlify and host the backend on Render/Railway.

Environment variables required:

- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — your Supabase anon key (or `SUPABASE_ANON_KEY`)
- Optional: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (server-side names)

Local Docker example:

```bash
docker build -t uchis-roles:latest .
docker run -e VITE_SUPABASE_URL="<your_url>" -e VITE_SUPABASE_ANON_KEY="<your_key>" -p 3000:3000 uchis-roles:latest
```

After deploying, verify endpoints:

- `GET /api/migrate-preview` — preview data mapped from `app_data`
- `POST /api/migrate` — best-effort migration of simple collections (`services, products, staff, announcements, messages, settings`)

If you want, I can prepare additional deployment artifacts (GitHub Actions, Render `render.yaml`) or attempt a local Docker build and run to validate. Tell me which path you prefer.
