// AIWG Cockpit — Tauri v2 desktop shell (#1594).
//
// The desktop window hosts the SAME registry-bound Bridge UI as the VS Code shell
// and the browser. It does not replace the CLI or reimplement the control plane:
// it waits for the Bridge's per-launch runtime token file and opens a window at the
// Bridge UI (token on the query string).
//
// Build is toolchain-gated: requires the Rust toolchain + Tauri prerequisites
// (on Linux, webkit2gtk + libsoup). Run `cargo tauri init` once to generate icons
// and capabilities, then `cargo tauri build`. See README.md.
use std::{fs, path::PathBuf, thread, time::Duration};
use tauri::{WebviewUrl, WebviewWindowBuilder};

fn runtime_file() -> PathBuf {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_default();
    PathBuf::from(home).join(".aiwg/cockpit/runtime/bridge.json")
}

/// Read { port, token } from the Bridge runtime file, if present.
fn read_runtime() -> Option<(u16, String)> {
    let raw = fs::read_to_string(runtime_file()).ok()?;
    let v: serde_json::Value = serde_json::from_str(&raw).ok()?;
    let port = v.get("port")?.as_u64()? as u16;
    let token = v.get("token")?.as_str()?.to_string();
    Some((port, token))
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            // Poll for the Bridge runtime file (operator/CLI launches `aiwg cockpit`),
            // then open the window at the Bridge UI with the token.
            thread::spawn(move || {
                for _ in 0..100 {
                    if let Some((port, token)) = read_runtime() {
                        let url = format!("http://127.0.0.1:{port}/?token={token}");
                        if let Ok(parsed) = url.parse() {
                            let _ = WebviewWindowBuilder::new(&handle, "main", WebviewUrl::External(parsed))
                                .title("AIWG Cockpit")
                                .inner_size(1100.0, 760.0)
                                .build();
                        }
                        return;
                    }
                    thread::sleep(Duration::from_millis(150));
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running AIWG Cockpit");
}
