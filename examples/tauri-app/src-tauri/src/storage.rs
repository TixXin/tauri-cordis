use std::sync::{Arc, Mutex};

use serde::Serialize;
use tauri_cordis::host_service;
use ts_rs::TS;

// `TS` is there because `#[host_service]` describes its types to TypeScript in test builds.
#[derive(Clone, Serialize, TS)]
pub struct Note {
    id: u32,
    text: String,
}

/// The notes live in memory and are gone when the app quits; a real app would keep them on disk.
#[derive(Clone)]
pub struct Notes(Arc<Mutex<Vec<Note>>>);

impl Default for Notes {
    fn default() -> Self {
        let seed = ["Buy milk", "Read the tauri-cordis README"];
        Self(Arc::new(Mutex::new(seed.iter().zip(1..).map(|(text, id)| Note { id, text: (*text).into() }).collect())))
    }
}

// `#[host_service]` puts a function under a name the built-in plugins can call: `ctx.rust.call("storage.read")`.
// Parameters are read from the call's JSON by name, except the ones in `inject(...)`, which come from `Serve::manage`.
#[host_service("storage.read", inject(notes))]
fn read(notes: Notes) -> Vec<Note> {
    notes.0.lock().unwrap().clone()
}

#[host_service("storage.write", inject(notes))]
fn write(notes: Notes, text: String) -> Result<Note, String> {
    if text.trim().is_empty() {
        return Err("a note needs some text".into());
    }
    let mut notes = notes.0.lock().unwrap();
    let note = Note { id: notes.len() as u32 + 1, text };
    notes.push(note.clone());
    Ok(note)
}
