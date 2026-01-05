# NewAPI Monitor (Win11 Desktop Widget)

A lightweight, transparent, always-on-top desktop widget for Windows 11 to monitor your [NewAPI](https://github.com/QuantumNous/new-api) / OneAPI usage and balance in real-time.

Built with **Tauri v2**, **React**, and **Rust**.

## ✨ Features

*   **Win11 Native Look**: Acrylic/Mica effect, rounded corners, and shadow.
*   **Always-on-Top**: Floats over other windows for quick glancing.
*   **Multi-Site Support**: Monitor multiple API providers simultaneously.
*   **Auto-Carousel**: Automatically rotates between different sites every 5 seconds.
*   **Precise Tracking**:
    *   **Today's Usage**: Tracks usage from 00:00 to now.
    *   **Balance**: Shows remaining account balance.
*   **Secure**: Uses Rust backend for HTTP requests to bypass CORS and browser restrictions, supporting full Cookie/Session based authentication.
*   **System Tray**: Minimize to tray when not needed.

## 🚀 Installation

1.  Download the latest `newapi-monitor.exe` from the [Releases](https://github.com/yourusername/newapi-monitor/releases) page (Coming soon).
2.  Run the executable.
3.  Right-click the tray icon to Quit.

## ⚙️ Configuration

1.  Click the **⚙️ (Settings)** button on the widget.
2.  Click **+ Add Site**.
3.  Fill in the details:
    *   **Name**: A display name (e.g., "My API").
    *   **URL**: The base URL of the NewAPI site (e.g., `https://api.example.com`).
    *   **Cookie**: Your login cookie (Grab this from your browser's DevTools -> Network -> `api/user/self` request).
    *   **User ID**: Your numeric User ID (usually found in the same request headers as `new-api-user`).
4.  Click **Save**.

## 🛠️ Development

### Prerequisites
*   Node.js (v18+)
*   Rust (Stable)
*   Visual Studio C++ Build Tools (Windows)

### Setup
```bash
git clone https://github.com/yourusername/newapi-monitor.git
cd newapi-monitor
npm install
```

### Run in Development Mode
```bash
npm run tauri dev
```

### Build for Production
```bash
npm run tauri build
```
The output executable will be at `src-tauri/target/release/newapi-monitor.exe`.

## 📄 License

MIT