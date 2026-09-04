# DocVault

A small full-stack app that solves one problem: stop hunting for documents.
Sign up, upload any file (PDF, JPG, PNG, DOCX, anything), give it a name,
and find it again instantly by searching that name — from any device, after
logging in.

## Stack (all free-tier)

| Piece            | Choice                                   | Why |
|-------------------|------------------------------------------|-----|
| Frontend          | React + Vite                             | Fast, simple, deploys free on Vercel/Netlify |
| Backend           | Node + TypeScript + Fastify              | Light, fast framework |
| Database          | MongoDB Atlas (free M0 cluster, 512 MB)  | Stores users + document metadata |
| File storage      | Cloudinary (free tier, 25 GB)            | Actually holds your uploaded files |
| Auth              | JWT + bcrypt password hashing            | Login/signup |
| Backend hosting   | Render (free web service)                | Runs the API |
| Frontend hosting  | Vercel (free)                            | Serves the React app |

Nothing here needs a paid plan for personal use.

## How it works

- Files themselves are stored on **Cloudinary** (not in MongoDB — MongoDB's
  free tier is too small for files, and Cloudinary is built for this).
- **MongoDB** only stores: your account, and for each document — its name,
  who uploaded it, and the Cloudinary link to it.
- Searching by name queries MongoDB; downloading redirects to a Cloudinary
  URL that forces a real file download with the original filename.

## Project structure

```
docvault/
  backend/     Fastify API (auth + upload + search + download)
  frontend/    React app (signup, login, dashboard)
```

## 1. Local setup

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev        # runs on http://localhost:5000
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev         # runs on http://localhost:5173
```

You need three free accounts before either `.env` is fully filled in —
set these up first (10 minutes total):

## 2. Create your free accounts

### MongoDB Atlas (database)
1. Sign up at https://www.mongodb.com/cloud/atlas/register
2. Create a free **M0** cluster (any region close to you).
3. Under **Database Access**, create a user with a password.
4. Under **Network Access**, add `0.0.0.0/0` (allow from anywhere — fine for
   a personal project; Render's IPs aren't static).
5. Click **Connect → Drivers**, copy the connection string, and put it in
   `backend/.env` as `MONGO_URI` (fill in the username/password/db name).

### Cloudinary (file storage)
1. Sign up at https://cloudinary.com/users/register_free
2. On your dashboard, copy **Cloud name**, **API Key**, and **API Secret**
   into `backend/.env`.

### JWT secret
Just put any long random string as `JWT_SECRET` in `backend/.env` — e.g.
generate one with `openssl rand -hex 32`.

## 3. Deploy for free

### Backend → Render
1. Push this repo to GitHub.
2. On https://render.com, click **New → Web Service**, connect the repo,
   set the root directory to `backend`.
3. Build command: `npm install && npm run build`
   Start command: `npm start`
4. Add all the variables from `backend/.env` under **Environment**.
5. Set `CORS_ORIGIN` to your future Vercel URL (you can update it after
   step below once you have it, then redeploy).
6. Deploy. Render gives you a URL like `https://docvault-api.onrender.com`.

   Note: on Render's free tier the service sleeps after inactivity and the
   first request after a while takes ~30s to wake up — normal for free
   hosting, not a bug.

### Frontend → Vercel
1. On https://vercel.com, **Add New → Project**, import the same repo,
   set the root directory to `frontend`.
2. Add environment variable `VITE_API_URL` = your Render URL from above.
3. Deploy. Vercel gives you a URL like `https://docvault.vercel.app`.
4. Go back to Render and set `CORS_ORIGIN` to that Vercel URL, then
   redeploy the backend so it accepts requests from it.

That's it — a live, working app with no monthly cost.

## API summary

| Method | Route                          | Auth | Purpose |
|--------|----------------------------------|------|---------|
| POST   | `/api/auth/signup`               | –    | Create account |
| POST   | `/api/auth/login`                 | –    | Log in |
| POST   | `/api/documents/upload`           | ✔    | Upload a file with a name |
| GET    | `/api/documents?search=term`      | ✔    | List / search your documents |
| GET    | `/api/documents/:id/download`     | ✔    | Get a forced-download link |
| DELETE | `/api/documents/:id`              | ✔    | Remove a document |

## Notes on limits

- Upload size is capped at 25 MB per file in `backend/src/index.ts`
  (`multipart` limits) — raise it if you need to, within Cloudinary's free
  tier limits.
- Cloudinary's free tier: 25 GB storage, 25 GB bandwidth/month — plenty for
  personal documents.
- MongoDB free M0: 512 MB — since it only stores text metadata (not files
  themselves), this is enough for tens of thousands of documents.
