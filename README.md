# 🕵️‍♂️ watchtower - Track API Traffic Easily

[![Download watchtower](https://img.shields.io/badge/Download-watchtower-ff6f61?style=for-the-badge)](https://github.com/Shubham60019/watchtower)

## 🖥️ What is watchtower?

watchtower helps you watch and check all the communication happening between AI coding tools like Claude Code or Codex CLI and their back-end services. It shows this in a clear, real-time web dashboard. You can use it to find problems, understand what the AI tools are doing behind the scenes, and fix issues faster.

This tool is built for anyone who works with AI coding agents and wants a simple way to see all API traffic without digging through complex logs.

---

## ⚙️ System Requirements

Before installing watchtower, make sure your Windows PC meets these requirements:

- Windows 10 or later
- At least 4 GB RAM
- 500 MB free disk space
- An internet connection (for real-time monitoring)
- Web browser (Chrome, Firefox, Edge)

You do not need to install additional software. watchtower runs on your computer and opens in your web browser.

---

## 🚀 Getting Started

### Step 1: Download watchtower

Visit this page to download the latest version of watchtower:

[Download watchtower](https://github.com/Shubham60019/watchtower)

Click the link above to open the GitHub page where you will find the download options. Typically, look for a file named something like `watchtower-setup.exe` under the Releases section.

### Step 2: Run the installer

- Once the download finishes, find the file in your Downloads folder.
- Double-click the `.exe` file.
- Follow the on-screen prompts to install watchtower. Choose the default settings unless you have specific needs.
- The installation usually takes less than a minute.

### Step 3: Open watchtower

- After installation, watchtower will launch automatically.
- If not, open it from the Start menu.
- The application opens a local web page (usually http://localhost:3000) in your default browser.
- You will see the dashboard where all monitored API traffic is displayed.

---

## 📊 Using watchtower

watchtower shows API messages between your AI coding agents and their servers. Here’s how to use it:

- The dashboard updates in real time. As your AI tool sends or receives data, watchtower captures and shows it.
- Use the filter options to focus on specific agents or API requests.
- Click on any request to see full details including headers, body, and response.
- The dashboard highlights errors or slow requests to help spot issues.
- You can pause and resume monitoring at any time using the buttons on the page.

This view lets you follow anything going on with your AI coding agents without needing to know how to read code or command prompts.

---

## 🔧 Configuration

watchtower works out of the box in most cases. You can customize how it monitors traffic:

- Change the network port in the settings if another app is using the default port.
- Set up API credentials if your agent needs authorization through watchtower.
- Choose which AI tools to track by listing their hostnames or IP addresses.
- Turn on logging to save API data for later review.

To reach settings, click the gear icon in the web dashboard.

---

## 🛠️ Troubleshooting

If you encounter problems:

- Make sure the installer completed without errors.
- Check that your browser supports WebSockets (all modern browsers do).
- Restart watchtower if the dashboard does not update.
- Confirm your AI agents are configured to use the system proxy or network settings watchtower relies on.
- Disable firewalls or antivirus if they might block watchtower’s network access.

You can also find help on the GitHub Issues page here:  
https://github.com/Shubham60019/watchtower/issues

---

## 📂 Folder Locations and Logs

By default, watchtower stores temporary data in the folder:

`C:\Users\<YourUsername>\AppData\Local\watchtower\data`

Log files are here:

`C:\Users\<YourUsername>\AppData\Local\watchtower\logs`

You can access these folders to backup or clear data for troubleshooting.

---

## 🔒 Privacy and Security

watchtower runs locally on your PC. It does not send your API data outside your computer unless you choose to enable cloud logging or share logs manually. All data stays private by default.

---

## ✅ Ready to install?

Click here to visit the download page:

[Download watchtower](https://github.com/Shubham60019/watchtower)

Follow the instructions above to get started watching your AI coding agents’ API traffic now.