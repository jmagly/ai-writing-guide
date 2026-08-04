// AIWG Cockpit — Tauri v2 desktop shell (#1594).
//
// The desktop window hosts the SAME registry-bound Bridge UI as the VS Code shell
// and the browser. It does not replace the CLI or reimplement the control plane:
// it waits for the Bridge runtime handshake, exchanges the native credential for
// a one-time nonce, and opens a window without placing the credential in a URL.
//
// Build is toolchain-gated: requires the Rust toolchain + Tauri prerequisites
// (on Linux, webkit2gtk + libsoup). Run `cargo tauri init` once to generate icons
// and capabilities, then `cargo tauri build`. See README.md.
use std::{
    fs,
    io::{Read, Write},
    net::TcpStream,
    path::PathBuf,
    thread,
    time::Duration,
};
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

fn issue_bootstrap_nonce(port: u16, token: &str) -> Option<String> {
    let mut stream = TcpStream::connect(("127.0.0.1", port)).ok()?;
    stream.set_read_timeout(Some(Duration::from_secs(2))).ok()?;
    let body = r#"{"audience":"tauri"}"#;
    let request = format!(
        "POST /bootstrap/nonce HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nAuthorization: Bearer {token}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    stream.write_all(request.as_bytes()).ok()?;
    let mut response = String::new();
    stream.read_to_string(&mut response).ok()?;
    let (head, raw_body) = response.split_once("\r\n\r\n")?;
    if !head.starts_with("HTTP/1.1 201 ") {
        return None;
    }
    serde_json::from_str::<serde_json::Value>(raw_body)
        .ok()?
        .get("nonce")?
        .as_str()
        .map(ToOwned::to_owned)
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            // Poll for the Bridge runtime file (operator/CLI launches `aiwg cockpit`),
            // then exchange the native token for a one-time webview bootstrap.
            thread::spawn(move || {
                for _ in 0..100 {
                    if let Some((port, token)) = read_runtime() {
                        if let Some(nonce) = issue_bootstrap_nonce(port, &token) {
                            let url = format!(
                                "http://127.0.0.1:{port}/#bootstrap={nonce}&audience=tauri"
                            );
                            if let Ok(parsed) = url.parse() {
                                let _ = WebviewWindowBuilder::new(
                                    &handle,
                                    "main",
                                    WebviewUrl::External(parsed),
                                )
                                .title("AIWG Cockpit")
                                .inner_size(1100.0, 760.0)
                                .build();
                            }
                            return;
                        }
                    }
                    thread::sleep(Duration::from_millis(150));
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running AIWG Cockpit");
}
