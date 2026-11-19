//! `NOTES_SELFTEST=1` makes the window drive itself (src/selftest.ts) and the app exit with the outcome.

use std::{thread, time::Duration};

use serde_json::{json, Value};
use tauri::AppHandle;

const LIMIT: Duration = Duration::from_secs(60);

fn wanted() -> bool {
    std::env::var("NOTES_SELFTEST").is_ok_and(|value| value == "1")
}

#[tauri::command]
pub fn selftest_wanted() -> bool {
    wanted()
}

/// Prints the window's result as one line of JSON and exits with 0 when it passed, 1 when it did not.
#[tauri::command]
pub fn selftest_report(app: AppHandle, result: Value) {
    finish(&app, &result);
}

fn finish(app: &AppHandle, result: &Value) {
    println!("{result}");
    app.exit(if result["ok"] == true { 0 } else { 1 });
}

/// Fails the run when the window never reports.
pub fn arm(app: &AppHandle) {
    if !wanted() {
        return;
    }
    let app = app.clone();
    thread::spawn(move || {
        thread::sleep(LIMIT);
        finish(&app, &json!({ "ok": false, "error": "the window did not report in time" }));
    });
}
