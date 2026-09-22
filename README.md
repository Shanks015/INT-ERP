# International Affairs ERP

Web application for managing the international affairs activities of Dayananda Sagar
University — partners and MoUs, campus visits, events and conferences, scholars in
residence, immersion and student-exchange programmes, memberships, media coverage,
outreach tracking, analytics and report generation.

This document is the deployment and operations guide. It is written for the IT team
hosting the application. Everything here has been verified against the code in this
repository.

---

## Contents

1. [Architecture](#1-architecture)
2. [Requirements](#2-requirements)
3. [Configuration — environment variables](#3-configuration--environment-variables)
4. [Local development](#4-local-development)
5. [Production deployment](#5-production-deployment)
   - [Option A — single service + reverse proxy (recommended)](#option-a--single-service--reverse-proxy-recommended)
   - [Option B — split frontend / backend](#option-b--split-frontend--backend)
   - [Option C — managed PaaS (Render)](#option-c--managed-paas-render)
6. [First run — accounts](#6-first-run--accounts)
7. [Operating the service](#7-operating-the-service)
8. [Optional integrations](#8-optional-integrations)
9. [Updating the application](#9-updating-the-application)
10. [Troubleshooting](#10-troubleshooting)
11. [Security notes](#11-security-notes)

---

## 1. Architecture

The application is **one Node.js service and one database**. In production the Node
service serves both the REST API and the compiled React front end, so a single origin
and a single TLS certificate are enough — no separate web server for the SPA and no
cross-origin configuration.

```
                      ┌──────────────────────────────┐
   Browser  ────────► │  Reverse proxy (nginx/IIS)   │  TLS terminates here
                      │  https://int-erp.dsu.edu.in  │
                      └──────────────┬───────────────┘
                                     │  http://127.0.0.1:5000
                      ┌──────────────▼───────────────┐
                      │  Node 22 (Express 4)         │
                      │  ├── /api/*   REST API       │
                      │  ├── /uploads/*  stored files│
                      │  └── /*       React SPA      │
                      │  In-process cron jobs        │
                      └───────┬──────────────┬───────┘
                              │              │
                   ┌──────────▼───┐   ┌──────▼─────────────┐
                   │ MongoDB 6+   │   │ Local disk:        │
                   │ (Atlas or    │   │ server/uploads/    │
                   │  self-hosted)│   │  profiles, attach. │
                   └──────────────┘   └────────────────────┘
```

| Component | Technology | Notes |
|---|---|---|
| Front end | React 18, Vite 5, TailwindCSS + daisyUI | Built to `client/dist`, served by the Node service |
| Back end | Node.js, Express 4 (ES modules) | Entry point `server/src/server.js` |
| Database | MongoDB via Mongoose 8 | Connection string in `MONGODB_URI` |
| Auth | JWT (bearer token) + bcrypt password hashing | Token secret in `JWT_SECRET` |
| Scheduled work | `node-cron`, in-process | See [§7](#background-jobs) |
| Reports | PDFKit / docx generated server-side | PDF, DOCX and CSV export |

**Two facts that shape the hosting setup:**

1. **The front end must be built before the server starts.** In `NODE_ENV=production`
   the server serves `client/dist` and returns `index.html` for every non-API route.
   If that folder is missing, the API works but the UI returns 404.
2. **Uploaded files are written to local disk**, under `server/uploads/`. That path
   must be on persistent storage (not a container's ephemeral layer) and must be
   included in backups.

---

## 2. Requirements

| | Minimum | Recommended |
|---|---|---|
| Node.js | 18.x | **22.x LTS** (the version CI builds and tests against) |
| MongoDB | 4.4 | **6.0+** — MongoDB Atlas or a self-hosted instance |
| CPU / RAM | 1 vCPU / 1 GB | 2 vCPU / 2 GB |
| Disk | 5 GB | 20 GB, on persistent storage, for `server/uploads` |
| Network | Outbound HTTPS | Required only for the optional integrations in [§8](#8-optional-integrations) |
| TLS | — | A certificate for the public hostname |

The service listens on `0.0.0.0:$PORT` (default `5000`) and expects to sit behind
exactly one reverse proxy — it sets Express `trust proxy` to `1` so client IPs are
read from `X-Forwarded-For` (used by rate limiting and the activity log).

Runtime dependencies are all public npm packages — no private registries, no native
build steps, no external services required to boot.

---

## 3. Configuration — environment variables

Create `server/.env` (copy `server/.env.example`). This file is git-ignored and must
never be committed or shipped inside a build artefact.

### Required

| Variable | Example | Purpose |
|---|---|---|
| `NODE_ENV` | `production` | **Must be `production`** in production. It enables serving `client/dist`, switches CORS to the allow-list, and hides internal error details from API responses. |
| `PORT` | `5000` | Port the Node service binds to. |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/int_erp` | Database connection string. |
| `JWT_SECRET` | 64 random hex chars | Signs login tokens. Changing it logs every user out. |
| `ENCRYPTION_KEY` | 64 random hex chars | AES-256 key used to encrypt stored mailbox credentials. **Changing it makes existing stored credentials unreadable** — see [§7](#secrets). |

Generate the two secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Optional — the app boots without these

| Variable | Default | Purpose |
|---|---|---|
| `CLIENT_URL` | — | Public origin of the app, e.g. `https://int-erp.dsu.edu.in`. Used in the CORS allow-list and as the keep-alive self-ping target. Set it even in a single-origin deployment. |
| `APP_URL` | — | Explicit keep-alive ping target; overrides `CLIENT_URL`. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | — | Outgoing mail for outreach reminder emails. Unset = reminders are skipped. |
| `SMTP_ADMIN_EMAIL` | — | Recipient for administrative notifications. |
| `GOOGLE_FORMS_WEBHOOK_SECRET` | — | Shared secret for the Google Forms → ERP webhook. **While unset, that endpoint accepts unauthenticated writes** (it logs a warning on every request). See [§11](#11-security-notes). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | Google OAuth client, shared by the mailbox and Drive integrations. |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | — | Per-record file uploads ([§8](#google-drive-file-uploads)). |
| `GOOGLE_DRIVE_SERVICE_ACCOUNT` / `GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE` / `GOOGLE_DRIVE_IMPERSONATE` | — | Alternative Drive credential (Workspace domain-wide delegation). |
| `DRIVE_MAX_FILE_MB` | `25` | Maximum size of a single file uploaded to Google Drive. |

The optional integrations are **inert until configured** — a missing credential
disables that feature's UI with a clear message; it never blocks startup or breaks
any other module.

---

## 4. Local development

```bash
git clone <repository-url>
cd <repository>

npm run install-all          # installs server + client dependencies
```

Create `server/.env` as described above but with development values:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/int_erp
JWT_SECRET=<64 hex chars>
ENCRYPTION_KEY=<64 hex chars>
CLIENT_URL=http://localhost:5173
```

Then, from the repository root:

```bash
npm run dev                  # runs API (:5000) and Vite dev server (:5173) together
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` to port 5000
(configured in `client/vite.config.js`), so no CORS setup is needed.

Individual processes:

```bash
npm run server               # API only, with nodemon auto-reload
npm run client               # Vite dev server only
```

Run the test suite (unit tests only — **no database access**, safe to run anywhere):

```bash
cd server && npm test        # vitest, 103 tests across 8 files
```

---

## 5. Production deployment

Pick one of the three options below. **Option A is recommended for university IT** —
it uses one service, one origin and no CORS configuration.

### Option A — single service + reverse proxy (recommended)

**Step 1 — install and build (once, as the service user):**

```bash
cd /opt/int-erp                 # or wherever the repository is checked out
npm run install-all             # server + client dependencies
npm run build                   # builds client/dist
```

**Step 2 — configure.** Write `/opt/int-erp/server/.env` with production values
([§3](#3-configuration--environment-variables)). At minimum: `NODE_ENV=production`,
`PORT`, `MONGODB_URI`, `JWT_SECRET`, `ENCRYPTION_KEY`, `CLIENT_URL`.

Protect it: `chmod 600 /opt/int-erp/server/.env` and make sure it is owned by the
service user only.

**Step 3 — run it as a service.** A systemd unit:

```ini
# /etc/systemd/system/int-erp.service
[Unit]
Description=International Affairs ERP
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=interp
WorkingDirectory=/opt/int-erp/server
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
StandardOutput=append:/var/log/int-erp/app.log
StandardError=append:/var/log/int-erp/app.log

[Install]
WantedBy=multi-user.target
```

```bash
sudo mkdir -p /var/log/int-erp && sudo chown interp /var/log/int-erp
sudo systemctl daemon-reload
sudo systemctl enable --now int-erp
sudo systemctl status int-erp
```

`WorkingDirectory` matters: the application resolves the uploads folder relative to
`server/`, so the process must start from there. Run a **single instance** — see
[§7](#background-jobs).

**Step 4 — reverse proxy and TLS.** An nginx site:

```nginx
server {
    listen 443 ssl;
    server_name int-erp.dsu.edu.in;

    ssl_certificate     /etc/ssl/certs/int-erp.dsu.edu.in.crt;
    ssl_certificate_key /etc/ssl/private/int-erp.dsu.edu.in.key;

    client_max_body_size 25m;          # file uploads

    location / {
        proxy_pass         http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;       # large report generation can take a while
    }
}
```

**Step 5 — verify:**

```bash
curl -fsS https://int-erp.dsu.edu.in/api/health     # {"status":"ok","message":"Server is running"}
```

Then open the site and sign in with the administrator credentials provided at
handover ([§6](#6-first-run--accounts)).

### Option B — split frontend / backend

Only if a separate static host is required. Two changes are mandatory:

1. Build the client with the API origin baked in:
   ```bash
   cd client
   VITE_API_URL=https://api.int-erp.dsu.edu.in/api npm run build
   ```
   Without it the production build calls `/api` on its own origin and every request
   404s.
2. Set the backend's `CLIENT_URL` to the **static site's** origin
   (e.g. `https://int-erp.dsu.edu.in`) so the API's CORS allow-list admits it. In
   production the allow-list is `CLIENT_URL` plus two legacy hostnames — a front end
   on any other origin will be blocked by the browser.

Uploaded files are served by the backend, so the static host must be able to load
`https://api.int-erp.dsu.edu.in/uploads/...`.

### Option C — managed PaaS (Render)

This is how the application is hosted today, and it remains supported.

1. **Database:** a MongoDB Atlas cluster. Create a database user and allow the
   application's egress IP (or `0.0.0.0/0` if the host has no fixed IP).
2. **Web service:** connect the repository, with
   - Root directory: *(repository root)*
   - Build command: `npm run install-all && npm run build`
   - Start command: `npm start`
   - Environment variables: as in [§3](#3-configuration--environment-variables)
3. **Persistent disk:** attach one and mount it at the repository's `uploads`
   directory, otherwise uploaded files are lost on every deploy. On free tiers
   without a disk, uploads are ephemeral — treat them as disposable.
4. **First run:** sign in with the administrator credentials provided at handover
   ([§6](#6-first-run--accounts)).

Free-tier instances sleep when idle; `.github/workflows/keep-alive.yml` and the
in-process keep-alive job exist to mitigate that. Neither is needed on a
continuously running server.

---

## 6. First run — accounts

The application has **no default, built-in or demo account**, and this repository
contains no credentials. An administrator account must already exist in the database
before anyone can sign in; it is provisioned during handover and its credentials are
delivered separately from this repository and this document. Do not write them into
any file that is committed.

Once you can sign in as that administrator:

1. Change the password under **Settings → Profile**.
2. Create day-to-day accounts through the app's own registration page and approve
   them under **User Management**. Roles are `admin`, `employee` and `intern`.
   Accounts created through registration are **pending** and cannot sign in until an
   administrator approves them — this, plus the per-module permissions, is what
   gates access to the system.
3. Review **Analytics** and **Activity Logs** to confirm the data set has loaded and
   that records are being written.

---

## 7. Operating the service

### Background jobs

Three scheduled jobs run **inside the Node process**. They start automatically once
the database connection is established and need no separate scheduler:

| Job | Schedule (Asia/Kolkata) | What it does |
|---|---|---|
| `imapReplySync` | every 15 minutes | Polls configured mailboxes and records replies against outreach records |
| `outreachFollowUp` | daily at 02:00 | Raises follow-up reminders for outreach with no reply |
| `keepAlive` | every 10 minutes | Self-pings `/api/health` |

**Run exactly one instance of the service.** Two instances would poll the same
mailboxes and raise duplicate reminders and notifications. For higher availability
you would need to move the jobs to a separate worker process first — the application
does not coordinate job execution across instances.

If the mailboxes are not configured, `imapReplySync` finds nothing to do and exits
quietly; there is nothing to disable.

### Health check

```
GET /api/health   →  200 {"status":"ok","message":"Server is running"}
```

Use this for load-balancer health checks and uptime monitoring.

### Logs

The service logs to stdout/stderr. With the systemd unit above they land in
`/var/log/int-erp/app.log`. It also appends startup and error entries to
`error.log` in the working directory — give it a log rotation rule so it cannot grow
without bound.

### Persistent data — back up all three

| What | Where | Why it matters |
|---|---|---|
| Database | `MONGODB_URI` | All records, users, activity logs |
| Profile photos & outreach attachments | `server/uploads/` | Not in the database; a container redeploy can erase them |
| `ENCRYPTION_KEY` and `JWT_SECRET` | `server/.env` | See below |

```bash
# Database backup
mongodump --uri="$MONGODB_URI" --out=/backup/int-erp-$(date +%F)

# Uploaded files
tar czf /backup/int-erp-uploads-$(date +%F).tar.gz -C /opt/int-erp/server uploads
```

To migrate to a different MongoDB server, `mongodump` from the old one and
`mongorestore` into the new one, then update `MONGODB_URI`.

### Secrets

- Changing `JWT_SECRET` invalidates all sessions; every user must log in again.
- Changing `ENCRYPTION_KEY` makes previously stored mailbox credentials
  undecryptable — those integrations must be reconnected. Keep it in the backup set
  and treat it as a production secret.

### Resource notes

| Behaviour | Detail |
|---|---|
| Report generation | Large reports are generated in memory. A full "All Modules" PDF for the current dataset is ~400 KB and takes a few seconds; keep `proxy_read_timeout` generous (the nginx example uses 300s). |
| Rate limits | 500 API requests per 15 minutes per IP, and 20 failed login attempts per 15 minutes per IP. Raise these for load testing, or the test itself will be throttled. |
| Request size | Profile photos and outreach attachments are capped at 5 MB; files uploaded to Google Drive are capped at 25 MB (`DRIVE_MAX_FILE_MB`). Set the reverse proxy's `client_max_body_size` to match or exceed the larger of the two (25 MB in the nginx example above), or large uploads fail at the proxy with a 413 before the application sees them. |

---

## 8. Optional integrations

Each of these is off until its credentials are set. None of them affects whether the
application boots.

### Outgoing email (SMTP)

Set the `SMTP_*` variables to send outreach reminder emails. Any authenticated SMTP
relay works. The service prefers IPv4 for outbound connections; this is set in code
and needs no configuration.

### Google Forms webhook

Google Forms can push submissions directly into the ERP through
`POST /api/google-forms/webhook`. Set `GOOGLE_FORMS_WEBHOOK_SECRET` and configure the
form's Apps Script to send the same value in the `X-Webhook-Token` header (or a
`?token=` query parameter).

### Mailboxes

Mailbox connections are added by an administrator in the app
(**Settings → Mailbox Connections**) and their credentials encrypted with
`ENCRYPTION_KEY`. This powers reply tracking and the reminder jobs.

### Google Drive (file uploads)

Per-record file uploads store files in one office Google Drive account. Set exactly
**one** credential source — a refresh token, or a service account with domain-wide
delegation — as documented in `server/.env.example`. The Drive API must be enabled
for the Google Cloud project that owns the OAuth client. Until a credential is set,
the per-record **Files** button reports that Drive is not configured.

---

## 9. Updating the application

```bash
cd /opt/int-erp
git pull
npm run install-all          # only needed when dependencies changed
npm run build                # rebuild the front end
sudo systemctl restart int-erp
```

Both must succeed before the restart — a failed client build leaves the previous
`client/dist` in place, so the site keeps working while you investigate.

The repository includes a CI workflow (`.github/workflows/ci.yml`) that runs the
server test suite and a client build on every push and pull request. A second
workflow (`verify-live.yml`) performs a read-only smoke test against a deployed
instance on demand. To run the same checks by hand before deploying:

```bash
cd server && npm test
cd ../client && npm run build
```

---

## 10. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| API responds, but the site returns 404 or a JSON 404 | `client/dist` is missing, or `NODE_ENV` is not `production`. Build the client and confirm the variable. |
| Login succeeds, then every request 401s | `JWT_SECRET` changed or differs between instances. Set one value everywhere and restart. |
| Browser console: CORS policy blocked | The front end's origin is not in the allow-list. In a single-origin deployment set `CLIENT_URL` to that exact origin; in a split deployment set it to the **static site's** origin. |
| Every API request 404s in a split deployment | The client was built without `VITE_API_URL`. Rebuild with it set. |
| Profile photos and attachments vanish after a deploy | Uploads are on ephemeral storage. Move `uploads` to a persistent volume and restore from backup. |
| "Too many requests" during testing | The rate limits in [§7](#resource-notes). Wait out the 15-minute window or raise the limits. |
| Database connection error at startup; process exits | `MONGODB_URI` is wrong or the database is unreachable — check the password, and that the host's IP is allowed in Atlas' network access list. |
| Emails not sending | A `SMTP_*` variable is unset, or the relay rejects the sender. Check the service log for the SMTP error. |
| `ENCRYPTION_KEY must be a 64-character hex string` | The key is missing or not 64 hex characters. Regenerate with the command in [§3](#3-configuration--environment-variables). |

Startup logs the database connection and the listening port; that is the first place
to look for any boot-time failure.

---

## 11. Security notes

The application already implements JWT authentication, bcrypt password hashing,
role-based access control, a maker–checker approval workflow for data changes
(non-admin edits require approval), `helmet` security headers, and the rate limits
described above. Three items are the hosting team's responsibility:

1. **Change the administrator password after the first sign-in**, and hand out
   individual accounts rather than sharing that one. Never commit credentials.
2. **Set `GOOGLE_FORMS_WEBHOOK_SECRET`.** Until it is set, the webhook endpoint
   accepts unauthenticated writes. If Google Forms integration is not used, leave
   the endpoint unreachable at the network layer.
3. **Keep `.env` out of version control and out of backups that leave the server**,
   and restrict its file permissions to the service user. It holds the database
   password, the token-signing secret and the encryption key.

TLS should be terminated at the reverse proxy, and the application should not be
exposed directly on port 5000 to the public network.

---

## Licence

MIT.

## Contact

Developed for Dayananda Sagar University, Office of International Affairs.
For application behaviour, data or accounts, contact the office. For hosting,
infrastructure and this document, contact the team that maintains the repository.
