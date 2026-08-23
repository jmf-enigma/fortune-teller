# Security and Privacy Policy

## Supported version

Security fixes are applied to the latest `0.1.x` release candidate until a stable release policy is announced.

## Reporting a vulnerability

After the project is hosted on GitHub, use a private GitHub Security Advisory when available. Do not place birth records, precise locations, private questions, replay seeds, terminal dumps containing personal data, or exploit details in a public issue.

Until a private reporting channel is configured, report only that a private security contact is needed; do not disclose the sensitive payload publicly.

## Threat model

The project treats these as sensitive:

- birth date, time, timezone, coordinates, and place;
- another person's data;
- private reflection questions;
- revealed replay seeds and exported readings.

The calculation engines make no network requests and do not persist input by default. Installing dependencies contacts the npm registry. A host Agent, shell wrapper, editor extension, backup service, or user-selected output path may have its own logging or synchronization behavior and must be assessed separately.

## Security properties

- strict JSON shapes and unknown-key rejection;
- explicit IANA timezone/DST handling;
- private pinned runtime isolation for the Zi Wei dependency's global config and plugin surface;
- no silent overwrite for CLI output files;
- no model-generated random result;
- OS secure randomness for fresh casts;
- SHA-256 counter stream, rejection sampling, and domain/profile separation for replay;
- generated replay seed hidden unless explicitly requested;
- network-capable source scan in the release check;
- sanitized JSON/file/internal error messages that do not echo private payloads or unnecessary paths;
- exact production dependency versions and lockfile.

## Important limits

- A replay seed is reproducibility material, not an authentication secret.
- A seed commitment proves only that the same seed representation was used; it does not prove supernatural selection or an untampered physical draw.
- `facts_hash` and `reproducibility_hash` are integrity aids, not digital signatures.
- Local execution does not protect data that the user saves to a synced folder or pastes into a remote model.
- Traditional readings must not be used for medical, legal, financial, criminal, crisis, or other high-stakes determinations.

## Safe disclosure checklist

When reporting a defect, use synthetic fixtures, name the affected version and command, redact absolute user paths when unnecessary, and state whether the issue can expose data, change calculated facts, weaken randomness, bypass input validation, or overwrite files.
