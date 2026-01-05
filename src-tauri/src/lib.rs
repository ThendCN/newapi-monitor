use tauri::menu::Menu;
use tauri::menu::MenuItem;
use tauri::tray::TrayIconBuilder;
use tauri::tray::TrayIconEvent;
use tauri::AppHandle;
use tauri::Manager;
use reqwest::header;

// Helper to construct the exact headers that work
fn get_headers(user_id: &str, cookie: &str, base_url: &str) -> Result<header::HeaderMap, String> {
    let mut headers = header::HeaderMap::new();
    headers.insert("authority", "api.husanai.com".parse().unwrap());
    headers.insert("accept", "application/json, text/plain, */*".parse().unwrap());
    headers.insert("accept-language", "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7".parse().unwrap());
    headers.insert("cache-control", "no-store".parse().unwrap());
    headers.insert("dnt", "1".parse().unwrap());
    headers.insert("new-api-user", user_id.parse().map_err(|_| "Invalid User ID")?);
    headers.insert("priority", "u=1, i".parse().unwrap());
    
    let referer = format!("{}/console", base_url.trim_end_matches('/'));
    headers.insert("referer", referer.parse().map_err(|_| "Invalid URL")?);

    headers.insert("sec-ch-ua", "\"Google Chrome\";v=\"143\", \"Chromium\";v=\"143\", \"Not A(Brand\";v=\"24\"".parse().unwrap());
    headers.insert("sec-ch-ua-mobile", "?0".parse().unwrap());
    headers.insert("sec-ch-ua-platform", "\"Windows\"".parse().unwrap());
    headers.insert("sec-fetch-dest", "empty".parse().unwrap());
    headers.insert("sec-fetch-mode", "cors".parse().unwrap());
    headers.insert("sec-fetch-site", "same-origin".parse().unwrap());
    headers.insert("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36".parse().unwrap());
    headers.insert("cookie", cookie.parse().map_err(|_| "Invalid Cookie")?);
    
    Ok(headers)
}

#[tauri::command]
fn fetch_quota(url: String, cookie: String, user_id: String) -> Result<String, String> {
    let client = reqwest::blocking::Client::builder()
        .cookie_store(true)
        .build()
        .map_err(|e| e.to_string())?;

    let headers = get_headers(&user_id, &cookie, &url)?;
    let target_url = format!("{}/api/user/self", url.trim_end_matches('/'));

    let res = client.get(&target_url).headers(headers).send().map_err(|e| format!("Request failed: {}", e))?;
    let status = res.status();
    let text = res.text().map_err(|e| format!("Read body failed: {}", e))?;

    if !status.is_success() {
        return Err(format!("HTTP Error {}: {}", status, text));
    }
    Ok(text)
}

#[tauri::command]
fn fetch_usage_stat(url: String, cookie: String, user_id: String, start_timestamp: i64, end_timestamp: i64) -> Result<String, String> {
    let client = reqwest::blocking::Client::builder()
        .cookie_store(true)
        .build()
        .map_err(|e| e.to_string())?;

    let headers = get_headers(&user_id, &cookie, &url)?;
    
    // Construct the URL with query parameters
    let base_clean = url.trim_end_matches('/');
    let target_url = format!(
        "{}/api/log/self/stat?type=2&token_name=&model_name=&start_timestamp={}&end_timestamp={}&group=",
        base_clean, start_timestamp, end_timestamp
    );

    let res = client.get(&target_url).headers(headers).send().map_err(|e| format!("Request failed: {}", e))?;
    let status = res.status();
    let text = res.text().map_err(|e| format!("Read body failed: {}", e))?;

    if !status.is_success() {
        return Err(format!("HTTP Error {}: {}", status, text));
    }
    Ok(text)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        // Register both commands here
        .invoke_handler(tauri::generate_handler![fetch_quota, fetch_usage_stat])
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let hide_i = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &hide_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app: &AppHandle, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
