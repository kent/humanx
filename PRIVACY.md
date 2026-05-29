# Privacy

VeriPost creates public proof links for X posts after World ID verification.

## Data Stored

When a proof is created, VeriPost stores:

- Post text submitted for the proof.
- X username from X login.
- Proof id, text digest, signal hash, proof commitment, creation timestamp, and verification metadata.
- Non-public World ID nullifier needed to prevent duplicate proof reuse for the same action.

Public proof pages show the post text, X username, proof id, digest, timestamp, and proof commitment. They do not show the raw World ID proof or full nullifier.

## Services Used

VeriPost uses X login for the posting account and forwards World ID proof responses to the World verifier. Request IP addresses may be processed temporarily for rate limiting and abuse prevention.

## Support, Deletion, And Abuse Reports

Email `support@veripost.io` for support, deletion requests, or abuse reports. Include the proof id or proof URL when the request concerns a public proof page.
