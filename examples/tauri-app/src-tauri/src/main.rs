#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod assets;
mod host;
mod selftest;
mod storage;

use tauri::{Manager, RunEvent};

fn main() {
    tauri::Builder::default()
        // Plugin window code is not part of the app's own bundle, so the window loads it from this scheme.
        .register_uri_scheme_protocol(assets::SCHEME, |context, request| {
            let host = context.app_handle().try_state::<host::Host>();
            assets::respond(host.as_deref().map(|host| host.dir.as_path()), &request)
        })
        .invoke_handler(tauri::generate_handler![host::host_connection, host::set_word_count_enabled, selftest::selftest_wanted, selftest::selftest_report])
        .setup(|app| {
            host::start(app.handle())?;
            selftest::arm(app.handle());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("the app did not start")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                app.state::<host::Host>().stop();
            }
        });
}
