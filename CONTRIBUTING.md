# Contributing

Thanks for helping improve VeriPost. This project is open source under the MIT License.

## Development Setup

```bash
pnpm install
pnpm dev
```

Use Node.js 22 or newer and pnpm 11 or newer.

## Pull Request Checklist

- Keep changes scoped to one problem.
- Add or update tests for behavior changes.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- Update `README.md`, `WORLD_APP_STORE.md`, or `.env.example` when behavior, deployment, or configuration changes.
- Do not commit secrets, generated `.next` output, local `.data` proof stores, or personal credentials.

## Commit Style

Use short imperative commit subjects, for example:

```text
Add proof URL validation
Fix World ID signal mismatch handling
```

## Product and Security Boundaries

- Do not add flows that imply VeriPost verifies X account ownership unless OAuth-backed account verification is implemented.
- Do not expose full World ID nullifiers or wallet-derived verifier values publicly.
- Keep World configuration and storage credentials out of client-only code unless they are explicitly public values.
- Keep proof creation inside World App, fail closed instead of following IDKit connector URLs, avoid redirect-capable auth/proof prompts, and use explicit same-window navigation only when the user chooses to post to X.

## License

By contributing, you agree that your contribution is licensed under the MIT License.
