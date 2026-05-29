# Security Policy

## Supported Versions

VeriPost is pre-1.0. Security fixes target the `main` branch.

## Reporting a Vulnerability

Do not open a public issue for vulnerabilities.

Use GitHub private vulnerability reporting for this repository when available. If private reporting is unavailable, contact the maintainer through GitHub and request a private disclosure channel.

Include:

- Affected commit or version.
- Steps to reproduce.
- Impact and affected data.
- Whether secrets, proof material, or nullifiers may be exposed.
- Any known mitigation.

## Security Expectations

- Never commit World Developer Portal signing keys or `.env.local`.
- Keep `WORLD_RP_SIGNING_KEY` server-side only.
- Do not expose full World ID nullifiers in public proof pages.
- Treat proof text and X post URLs as public once a proof is created.
- Replace the local JSON proof store with durable production storage before public launch.
