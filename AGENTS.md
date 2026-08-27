# Repository agent instructions

## Docker-first development

Run application development and verification commands inside the Docker Compose environment. Do not start host-side Vite development or preview servers for this repository.

- Start or refresh the stack with `docker compose up -d --build`.
- Run project commands in the application container with `docker compose exec -T app <command>`.
- After changing `package.json`, `package-lock.json`, `Dockerfile.dev`, or Compose configuration, rebuild the application service before verification.
- Use the Compose application at `http://127.0.0.1:3000` and PocketBase at `http://127.0.0.1:8090`.
- Run browser tests against the Compose application rather than launching Playwright's host-side preview server. Set `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000` when required.

Common verification commands:

```sh
docker compose exec -T app npm run format:check
docker compose exec -T app npm run check
docker compose exec -T app npm run test:unit
docker compose exec -T app npm run build
```

Prefer an image/container with Chromium available for Playwright execution. If Playwright is invoked outside the `app` service, it must still target the Compose-hosted application; do not start a separate host-side application server.
