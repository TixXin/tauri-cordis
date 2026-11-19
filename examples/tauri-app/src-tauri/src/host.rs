use std::{
    ffi::OsString,
    fs, io,
    path::{Path, PathBuf},
    sync::{Arc, OnceLock},
    thread,
};

use serde::Serialize;
use tauri::{AppHandle, Manager, State};
use tauri_cordis::{node_for_host, official_download, Event, HostSpec, HostState, NoContainment, NodeSearch, Serve, Supervisor, Timing, MINIMUM_NODE};

use crate::storage::Notes;

// The example runs from its checkout, so the host script and the plugins are read straight from the
// source tree. A shipped app copies them into its bundle and looks under `app.path().resource_dir()`.
const HOST_SCRIPT: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../node_modules/tauri-cordis/src/host/main.mjs");
const BUILTINS: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../plugins/builtins");
const WORD_COUNT_SOURCE: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../plugins/word-count");

const WORD_COUNT: &str = "@demo/word-count";
const PLUGINS_FILE: &str = "plugins.yml";

pub struct Host {
    /// The plugin folder in the app's data: plugins.yml, installed packages, each plugin's own data.
    pub dir: PathBuf,
    supervisor: OnceLock<Supervisor>,
}

impl Host {
    pub fn stop(&self) {
        if let Some(supervisor) = self.supervisor.get() {
            supervisor.stop();
        }
    }
}

pub fn start(app: &AppHandle) -> Result<(), String> {
    let data = app.path().app_data_dir().map_err(|error| error.to_string())?;
    let dir = data.join("plugins");
    install_word_count(&dir).map_err(|error| format!("could not set up {}: {error}", dir.display()))?;
    let args = host_args(app, &dir);
    app.manage(Host { dir, supervisor: OnceLock::new() });

    // Every `#[host_service]` function in this binary, and the state their `inject(...)` asks for.
    let mut serve = Serve::registered()?;
    serve.manage(Notes::default());

    let app = app.clone();
    // Finding Node tries several places and downloads one when the machine has none, so it stays off the main thread.
    thread::spawn(move || {
        if let Err(error) = supervise(&app, &data, args, serve) {
            eprintln!("[notes] the plugin host did not start: {error}");
        }
    });
    Ok(())
}

fn supervise(app: &AppHandle, data: &Path, args: Vec<OsString>, serve: Serve) -> Result<(), String> {
    let node = node_for_host(&NodeSearch::from_env(), MINIMUM_NODE, data, official_download(None), &mut |_| {})?;
    eprintln!("[notes] Node {} at {}", node.version, node.path.display());
    let spec = HostSpec { program: node.path, args, env: Vec::new(), current_dir: None };
    // The supervisor starts the host, pings it, and starts it again (backing off) when it dies or hangs.
    let supervisor = Supervisor::start_serving(move |_| spec.clone(), Arc::new(NoContainment), Timing::default(), Some(Arc::new(serve)), on_event)?;
    let _ = app.state::<Host>().supervisor.set(supervisor);
    Ok(())
}

fn host_args(app: &AppHandle, dir: &Path) -> Vec<OsString> {
    let mut args: Vec<OsString> = vec![
        "--disallow-code-generation-from-strings".into(),
        HOST_SCRIPT.into(),
        "--dir".into(),
        dir.into(),
        "--builtins".into(),
        BUILTINS.into(),
        "--app-version".into(),
        env!("CARGO_PKG_VERSION").into(),
        // Read plugins.yml again whenever it changes: this is what makes the on/off switch live.
        "--watch".into(),
    ];
    // The host only lets pages from known origins open its socket. It knows Tauri's own;
    // under `tauri dev` the page comes from the Vite server, so that origin is named here.
    if let Some(url) = app.config().build.dev_url.as_ref().filter(|_| tauri::is_dev()) {
        args.extend(["--origin".into(), url.origin().ascii_serialization().into()]);
    }
    args
}

fn on_event(event: Event) {
    match event {
        Event::State(HostState::Ready { pid, .. }) => eprintln!("[host] ready (pid {pid})"),
        Event::State(state) => eprintln!("[host] {state:?}"),
        // `clients` lists the window files of running plugins; `log` carries the host's warnings and errors.
        Event::Notification { method, params } => eprintln!("[host {method}] {params}"),
        Event::Stderr(line) => eprintln!("[host] {line}"),
    }
}

/// Puts the example's third-party plugin where an installed one lives, `<dir>/packages/<package name>`,
/// and lists it in plugins.yml. A real app does this when the user installs a package.
fn install_word_count(dir: &Path) -> io::Result<()> {
    let folder = dir.join("packages").join(WORD_COUNT);
    if folder.exists() {
        fs::remove_dir_all(&folder)?;
    }
    fs::create_dir_all(&folder)?;
    for entry in fs::read_dir(WORD_COUNT_SOURCE)? {
        let entry = entry?;
        if entry.file_type()?.is_file() {
            fs::copy(entry.path(), folder.join(entry.file_name()))?;
        }
    }
    if !dir.join(PLUGINS_FILE).exists() {
        write_plugins_file(dir, true)?;
    }
    Ok(())
}

fn write_plugins_file(dir: &Path, word_count_enabled: bool) -> io::Result<()> {
    let switch = if word_count_enabled { "" } else { "  disabled: true\n" };
    fs::write(dir.join(PLUGINS_FILE), format!("- id: \"{WORD_COUNT}\"\n  source: manual\n{switch}"))
}

#[derive(Serialize)]
pub struct Connection {
    port: u64,
    token: String,
}

/// Where the window finds the host's socket: `None` until the host is ready, and again while it restarts.
#[tauri::command]
pub fn host_connection(host: State<Host>) -> Option<Connection> {
    let HostState::Ready { ready, .. } = host.supervisor.get()?.state() else { return None };
    Some(Connection { port: ready["windows"]["port"].as_u64()?, token: ready["windows"]["token"].as_str()?.to_owned() })
}

#[tauri::command]
pub fn set_word_count_enabled(host: State<Host>, enabled: bool) -> Result<(), String> {
    write_plugins_file(&host.dir, enabled).map_err(|error| error.to_string())
}
