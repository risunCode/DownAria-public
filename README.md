# 🎵 DownAria - Frontend

Modern web frontend for DownAria media extraction and download flow. Built with **Next.js**, **TypeScript**, and **Tailwind CSS**.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-GPL--3.0-blue)](./LICENSE)

---

## 📸 Screenshots

### Desktop

| Home | Documentation | Settings |
|:----:|:-------------:|:--------:|
| ![Home](https://github.com/user-attachments/assets/c8d6d40d-bf09-4128-8426-d45f0ad43411) | ![Documentation](https://github.com/user-attachments/assets/ade7b2e7-a9e4-4355-9eef-7bc7f6f1e704) | ![Settings](https://github.com/user-attachments/assets/82701057-ecdc-4597-835d-01808e6226c4) |

| About |
|:-----:|
| ![About](https://github.com/user-attachments/assets/526a8541-06d3-4f3c-ada7-c4e2f1252e2c) |

### Mobile

| Home | Documentation | Settings | About |
|:----:|:-------------:|:--------:|:-----:|
| ![Home Mobile](https://github.com/user-attachments/assets/c24be2c5-caf6-43c4-b6cc-468251a50d87) | ![Docs Mobile](https://github.com/user-attachments/assets/108c8086-51ea-41e3-bade-66bb85b42336) | ![Settings Mobile](https://github.com/user-attachments/assets/d35b03b4-5c39-4577-a467-52c1f14322b7) | ![About Mobile](https://github.com/user-attachments/assets/d96707d5-2235-416e-bb1b-6dbbe2c97e0e) |

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🌐 **Multi-Platform Support** | YouTube, Instagram, Twitter/X, Facebook, TikTok, Pixiv |
| 🎯 **Auto-Detect Platform** | URL platform detection on submit |
| 📦 **Unified Extraction UX** | Uses backend extract/proxy/merge flow with normalized responses |
| 🎬 **Preview + Download** | Video/image/audio preview with format selector |
| 🔁 **History Refetch** | Re-run extraction from history item directly to home |
| ⏱️ **Rate Limit UX** | Modal with reset-aware countdown and retry hints |
| ⚙️ **Settings Tabs** | Basic, Cookies, Storage, Integrations |
| 🧪 **Experimental Controls** | Seasonal effects + custom background controls (blur/zoom/move/sound) |
| 📚 **Docs Hub** | Overview, API, FAQ, Changelog pages |
| 📦 **PWA Support** | Installable app flow |

---

## 🏗️ Architecture

| Component | Technology |
|-----------|------------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 |
| **Animation** | Framer Motion |
| **i18n** | next-intl |
| **Client Storage** | IndexedDB + LocalStorage |
| **Icons** | Lucide + FontAwesome |
| **Alerts** | SweetAlert2 |

---

## 🔌 API Integration

Frontend integrates with `DownAria-API` backend:

- `POST /api/v1/extract`
- `GET /api/v1/proxy`
- `POST /api/v1/merge`
- `GET /api/settings`

---

## 🚀 Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3001`.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run development server (port 3001) |
| `npm run build` | Build for production (runs prebuild tasks) |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest |

---

## 🔧 Environment Variables

Defined in `.env.example`.

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Frontend URL |
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_STORAGE_KEY` | Optional storage namespace |
| `FEEDBACK_DISCORD_WEBHOOK_URL` | Server-side webhook for About feedback API |
| `LOG_LEVEL` | Runtime log level |
| `NODE_ENV` | App environment |

---

## 🧠 Runtime Notes

- `prebuild` updates service worker build timestamp.
- `prebuild` copies root `CHANGELOG.md` into `public/Changelog.md` for docs changelog page.
- This project is frontend runtime; backend service is in sibling project `DownAria-API`.

---

## 📄 License

[GPL-3.0](./LICENSE)
