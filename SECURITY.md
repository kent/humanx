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

- Never commit `.env.local`, production database credentials, or other secrets.
- Keep database credentials, private RPC credentials, and any private verifier credentials server-side.
- Do not expose wallet addresses, raw World ID nullifiers, or verifier values in public proof pages.
- Treat proof text and X post URLs as public once a proof is created.
- Replace the local JSON proof store with durable production storage before public launch.
