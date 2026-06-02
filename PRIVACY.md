# Privacy

VeriPost creates public proof links for X posts from a logged-in World ID inside World App.

## Data Stored

When a proof is created, VeriPost stores:

- Post text submitted for the proof.
- Proof id, text digest, signal hash, proof commitment, creation timestamp, and verification metadata.
- Non-public World ID proof verifier needed to prevent duplicate proof reuse for the same post text.

Public proof pages show the post text, proof id, digest, timestamp, and proof commitment. They do not show wallet addresses or private verifier values.

## Services Used

VeriPost reads the logged-in World App account context inside World App and verifies that account through the World ID Address Book before storing a proof. VeriPost does not start IDKit, wallet-auth, connector navigation, X-login, or external browser authentication when creating a proof. Wallet addresses are not shown on public proof pages. Request IP addresses may be processed temporarily for rate limiting and abuse prevention.

## Support, Deletion, And Abuse Reports

Email `support@veripost.io` for support, deletion requests, or abuse reports. Include the proof id or proof URL when the request concerns a public proof page.
