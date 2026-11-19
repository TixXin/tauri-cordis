# Security model

Short version: **a plugin is as trusted as the app.** tauri-cordis does not sandbox plugins. It makes it hard to install a plugin nobody looked at, and easy to take one back.

This page says what is protected, by what, and what is not. To report a vulnerability, see [SECURITY.md](../SECURITY.md).

## What a plugin can do

The host part of a plugin is a Node module in the host process. It runs with the permissions of the user who started your app. It can read and write files, open sockets, and start programs. It shares the process with every other plugin, so it can also reach their memory.

There is no permission prompt, because a prompt for "full access" would be the only honest one, and users click through those. The design accepts this and puts the checks earlier.

If your threat model includes running code from people you do not trust at all, this is the wrong tool. Use a design with real isolation (WebAssembly, a separate OS user, a container) and pass capabilities in.

## What is enforced at run time

These hold no matter what a plugin does:

| Boundary | How |
|---|---|
| Only your windows reach the host | The WebSocket listens on `127.0.0.1`. A connection must come from an allowed `Origin` and present a token that is random per host start. Wrong origin is refused before the upgrade; wrong token, no hello, or wrong protocol each close with their own code. |
| Third-party plugins cannot call the shell | `ctx.rust.call` and `ctx.rust.on` fail with `forbidden` for anything that is not a built-in plugin. Native methods are reached only through services a built-in plugin chooses to offer. |
| `plugins.yml` cannot promote a plugin | An entry there cannot make a plugin built-in or swap a built-in plugin's code. Built-in plugins come only from the app's own `builtins.json`. |
| The host can run without building code from strings | Start it with Node's `--disallow-code-generation-from-strings`, so `eval` and `new Function` throw. The runtime is tested under that flag and Fuyu ships with it. |
| A plugin cannot take the host down by accident | Stray exceptions and rejections are traced to the plugin and logged. Five within a minute switch it off. |
| A plugin's files stay in its folder | The manifest's `host`, `client` and `config` entries must resolve to files inside the package, after following links. |

And these are checks, not walls:

- **`ctx.http.fetch` and `network`.** A manifest lists the hosts a plugin talks to, and `ctx.http.fetch` refuses anything else with `undeclared-network`. A plugin can still import `node:https`. The list is there so a reviewer and a user can see what the plugin says it does, and so the review tool can flag code that goes around it.
- **`nodeApis`.** The build records which Node modules the bundle imports. Again a statement to review, not a restriction.
- **Declared services, slots and windows.** A plugin that registers something it did not declare is marked `undeclared` in its status. Packages from the market or installed by hand are refused if they use interfaces marked experimental.

## What happens before installation

This is where most of the protection is. The pieces are in `@tauri-cordis/manifest`, `@tauri-cordis/market` and `@tauri-cordis/review`; you decide how strict your market is.

1. **The market builds from source.** An author submits a repository and a commit, not a binary. The market builds the package itself, so what users install is what reviewers read. Builds are reproducible: the same commit gives the same bytes.
2. **Every version is reviewed against the previous one.** `tauri-cordis-plugin review <old> <new>` diffs source and bundle and grades the change: new Node APIs, new network hosts, dependency changes, install scripts, obfuscated code, files that changed in the lockfile without a version change. Green, yellow or red.
3. **Signatures.** Packages can carry an author signature and a market signature (Ed25519). The app trusts a fixed set of market keys compiled into it.
4. **A signed index that expires.** The list of what is on the market is signed, has a serial number that must not go backwards, and an expiry date, so an old index cannot be replayed to hide a removal.
5. **Cooldown.** A new version is offered for automatic update only after it has been public for a few days (3 by default), which gives people time to notice a bad release.
6. **Revocation.** A separate signed list names versions that must not run. It is verified against its own set of trusted keys, kept apart from the keys that sign the index.

## What you are responsible for

- **The trust root.** Which keys your app accepts, where the index is fetched from, and who can sign.
- **Review.** The tools grade a change. A person approves it.
- **Manual installs.** Decide whether users may install a package file from outside your market, and how loudly to warn them.
- **The shell's surface.** Every `#[host_service]` method is callable by every built-in plugin. Keep secrets on the Rust side and return results, not keys.
- **Process containment.** The host quits when its stdin closes. If you also want the operating system to guarantee that no child outlives your app, implement `Containment` (a Job Object on Windows, a process group elsewhere) and pass it to the supervisor.

## Known limits

- No isolation between plugins in the host.
- A plugin's window part runs in your WebView, in the same JavaScript realm as your UI.
- Origin and token protect against other web pages and other local users guessing the port. They do not protect against other processes running as the same user, which can read your app's memory anyway.
