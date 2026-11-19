use std::{
    fs,
    path::{Path, PathBuf},
};

use tauri::http::{header, HeaderValue, Method, Request, Response, StatusCode};

pub const SCHEME: &str = "notes-plugin";

/// Plugin window code imports React from here and gets the copy the window already runs
/// (the window hands it over with `installShared`, see src/plugins.ts).
const SHARED: [(&str, &str); 2] = [
    ("__shared/react.js", include_str!("../../node_modules/tauri-cordis/src/client/shims/react.js")),
    ("__shared/react-jsx-runtime.js", include_str!("../../node_modules/tauri-cordis/src/client/shims/react-jsx-runtime.js")),
];

/// Only installed packages are served: plugins.yml and each plugin's private data stay out of reach.
fn file(dir: &Path, path: &str) -> Option<PathBuf> {
    // Resolve ".." and links before checking where the file really is.
    let packages = fs::canonicalize(dir.join("packages")).ok()?;
    let file = fs::canonicalize(dir.join(path)).ok()?;
    (file.starts_with(packages) && file.is_file()).then_some(file)
}

fn content_type(path: &str) -> &'static str {
    match path.rsplit('.').next() {
        Some("js" | "mjs") => "text/javascript",
        Some("css") => "text/css",
        Some("json") => "application/json",
        Some("svg") => "image/svg+xml",
        Some("png") => "image/png",
        _ => "application/octet-stream",
    }
}

/// `dir` is the plugin folder in the app's data (`Host::dir`).
pub fn respond(dir: Option<&Path>, request: &Request<Vec<u8>>) -> Response<Vec<u8>> {
    let path = request.uri().path().trim_start_matches('/');
    let found = match SHARED.iter().find(|(name, _)| *name == path) {
        Some((_, text)) => Some(text.as_bytes().to_vec()),
        None => dir.and_then(|dir| file(dir, path)).and_then(|file| fs::read(file).ok()),
    };
    let status = if found.is_some() { StatusCode::OK } else { StatusCode::NOT_FOUND };
    // The loader asks with HEAD first, to check the file is there and is JavaScript.
    let body = found.filter(|_| request.method() != Method::HEAD).unwrap_or_default();
    let mut response = Response::new(body);
    *response.status_mut() = status;
    let headers = response.headers_mut();
    headers.insert(header::CONTENT_TYPE, HeaderValue::from_static(content_type(path)));
    // The page and this scheme are different origins, and a module import across origins needs this.
    headers.insert(header::ACCESS_CONTROL_ALLOW_ORIGIN, HeaderValue::from_static("*"));
    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"));
    response
}
