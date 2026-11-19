# @tauri-cordis/market

The format and the checks of a plugin market for [tauri-cordis](https://github.com/TixXin/tauri-cordis): a signed index of what is published, a signed list of what is revoked, and the rule for which version a user should get.

```bash
npm install @tauri-cordis/market
```

- Verifies the **index** signature against trusted keys, and that its serial number has not gone backwards and it has not expired, so an old index cannot be replayed.
- Verifies the **revocation list** against its own set of keys.
- Checks **author keys** and the signatures on each version.
- **Selects a version** for a given app version and platform, skipping revoked ones and, for automatic updates, versions still inside the cooldown (3 days by default).

It reads and checks data; it does not fetch anything or run a server. A market can be a static file host and a CI job.

Docs: [security model](https://github.com/TixXin/tauri-cordis/blob/main/docs/security.md#what-happens-before-installation). License: MIT.
