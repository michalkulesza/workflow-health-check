# Operations runbook

## Deployment

The production topology is one versioned application image running separate
`web` and `worker` processes, PostgreSQL on the private Compose network, and a
Caddy reverse proxy as the only public service. Populate deployment secrets in
the host's protected environment or a secret manager; do not use `.env` files
from local development.

Before starting a new release, take and verify a backup, then run migrations as
the explicit one-shot maintenance service. Do not run migrations from `web` or
`worker` startup.

```sh
IMAGE_TAG=release-$(git rev-parse --short HEAD) docker compose build migrate
IMAGE_TAG=release-$(git rev-parse --short HEAD) docker compose --profile maintenance run --rm migrate
IMAGE_TAG=release-$(git rev-parse --short HEAD) docker compose up --detach web worker proxy
```

All roles use the image named `workflow-health-check:$IMAGE_TAG`; record its digest with `docker image inspect`. A failed migration stops this release procedure—do not start web or worker until it is corrected. The PostgreSQL service is private in the production Compose network. For a host-only disposable database, use `compose.postgres.yaml`, which binds PostgreSQL to loopback only.

The live health endpoint checks only process availability. The readiness
endpoint also verifies PostgreSQL and reports a stale worker heartbeat as 503:
`/api/health/live` and `/api/health/ready`. Responses intentionally contain no
submission, customer, or configuration data.

## Backup and restore rehearsal

Run `npm run db:backup` on an operator host with PostgreSQL client tools,
`DATABASE_URL`, and an absolute `BACKUP_DIRECTORY` outside the repository.
Copy the encrypted backup to the approved off-host destination and retain the
restore log separately. The application does not schedule or claim to perform
off-host delivery by itself.

Restore only into an isolated database. Set `RESTORE_DATABASE_URL` to that
database, set `ALLOW_DATABASE_RESTORE=true`, then run:

```sh
npm run db:restore -- /absolute/path/to/workflow-health-<timestamp>.dump
```

Record the elapsed time and a post-restore read/worker smoke check. Never point
the restore command at a production database.

## Retention

`npm run retention:purge` is a dry run until
`RETENTION_PURGE_APPROVED=true` is explicitly configured after policy approval.
It reports only counts, then removes expired sessions, incomplete submissions
inactive for 30 days, and completed submissions inactive for 12 months. An
open lead prevents completed-assessment deletion; closed leads are deleted with
the related private submission data. Published questionnaire content is never
part of this purge.

Schedule the command from the operator's scheduler only after the policy,
backup expiry, and active-lead review process are accepted. Keep its JSON count
output as the audit record; it must not log answers, emails, tokens, or secrets.
