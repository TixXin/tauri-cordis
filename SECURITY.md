# Security policy

## Reporting a vulnerability

Please report privately, not in a public issue.

Use **[Report a vulnerability](https://github.com/TixXin/tauri-cordis/security/advisories/new)** on this repository's Security tab. Say what is affected, how to reproduce it, and what an attacker gains. We aim to answer within a week. A fix is released before the details are published, and you are credited unless you ask not to be.

## What counts

tauri-cordis does not sandbox plugins: a plugin that is installed and running has the user's permissions by design. Read the [security model](./docs/security.md) first. "A plugin can read files" is not a vulnerability here.

These are:

- A window or web page reaching the host without the token or from an origin that is not allowed.
- A third-party plugin calling the shell (`ctx.rust`) or becoming built-in.
- A package that passes signature or index verification when it should not: a forged or replayed index, a bypassed revocation, a signature accepted for other content.
- A package whose files escape its folder on unpack or load.
- The review tool missing a change it claims to detect.
- The Node download accepting a file whose hash does not match.
- A plugin that is switched off still running code.

## Supported versions

Fixes go into the latest 0.x release. There are no long-term branches before 1.0.
