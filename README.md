# 🎵 DownAria - Frontend

# Visit Downaria Official 
- https://downaria.vercel.app

# This Development Version
- https://down-aria.vercel.app

Modern web frontend for DownAria. Built with **Next.js**, **TypeScript**, and **Tailwind CSS**.

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
| 🔐 **Backend Integration** | Public API integration with Backend backend |
| 🛡️ **Reliability Features** | Request timeouts, circuit breaker, exponential backoff, request deduplication |
| 🚀 **Performance Optimized** | Concurrent request limiting, connection pooling, memory-safe large file handling |
| ⚙️ **Settings Tabs** | Basic, Cookies, Storage, Integrations |
| 🧪 **Experimental Controls** | Seasonal effects + custom background controls (blur/zoom/move/sound) |
| 📚 **Docs Hub** | Overview, cleanup notes, and FAQ pages |
| 📦 **PWA Support** | Installable app flow |
| 🎨 **Theme System** | Semantic surface/status tokens, gradient accents, and reduced-motion coverage |

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
| **Typography** | Outfit across the full app |

---

## 🔌 Integration Status

DownAria now uses a thin server-side bridge for Backend.

- `src/app/api/*` proxies forward extract, download, and job polling requests to Backend.
- Backend URL building is handled in `src/infra/api/session.ts`.
- Shared proxy validation and retry logic live in `src/infra/api/proxy.ts`.
- The old signed frontend gateway flow remains removed.

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
| `NEXT_PUBLIC_BASE_URL` | Canonical public app URL for metadata and links |
| `VERCEL` | Deployment/runtime indicator |
| `LOG_LEVEL` | Runtime log level |
| `NODE_ENV` | App environment |

---

## 🧠 Runtime Notes

- `prebuild` updates the service worker build timestamp and mirrors `CHANGELOG.md` into `public/Changelog.md`.
- Route groups are used to separate app, docs, and marketing surfaces without changing public URLs.
- Shared UI/layout/config surfaces live under `src/shared/`, while feature-owned logic lives under `src/modules/`.
- This project is frontend runtime; backend service is in sibling project `DownAria-API`.

---

## 📄 License

[GPL-3.0](./LICENSE)
