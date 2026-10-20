# Chembuli FC Platform — System Information Index

This directory (`system_info/`) contains comprehensive architectural, technical, operational, and development documentation for the Chembuli FC web platform. It is engineered to serve as an authoritative reference for human developers and context for future AI / Large Language Models (LLMs).

---

## Documentation Suite Map

| Document | Purpose & Scope |
| :--- | :--- |
| **[00_OVERVIEW.md](file:///c:/Users/hailq/Music/Chembuli/system_info/00_OVERVIEW.md)** | High-level system overview, club purpose, primary features, complete technology stack, and quick-start guide. |
| **[01_ARCHITECTURE.md](file:///c:/Users/hailq/Music/Chembuli/system_info/01_ARCHITECTURE.md)** | Full-stack application architecture: SSR/Client lifecycle, layout hierarchies, reactive store pattern, asset pipelines, active Appwrite backend, and audit streams. |
| **[02_DIRECTORY_AND_FILE_MAP.md](file:///c:/Users/hailq/Music/Chembuli/system_info/02_DIRECTORY_AND_FILE_MAP.md)** | Exhaustive, line-by-line file scan and directory mapping covering the entire repository outside `node_modules`. |
| **[03_DATA_MODELS_AND_SCHEMA.md](file:///c:/Users/hailq/Music/Chembuli/system_info/03_DATA_MODELS_AND_SCHEMA.md)** | Complete TypeScript interfaces, business invariants (e.g., dynamic event status, unique CFC references, UPI payment screenshot validation, team color allocation, CSV export specs). |
| **[04_ROUTES_AND_PAGES.md](file:///c:/Users/hailq/Music/Chembuli/system_info/04_ROUTES_AND_PAGES.md)** | Route catalog detailing all public and administrative views, their URLs, UI layouts, interactive behaviors, CSV export, and reference audit log. |
| **[05_INTEGRATIONS_AND_APIS.md](file:///c:/Users/hailq/Music/Chembuli/system_info/05_INTEGRATIONS_AND_APIS.md)** | Backend server functions (`createServerFn`), Gmail SMTP integration (Nodemailer), Appwrite Cloud 6-collection database & 2-bucket storage schema, Super-Admin role system, and audit dispatches. |
| **[06_LLM_CONTEXT_AND_DEVELOPER_GUIDE.md](file:///c:/Users/hailq/Music/Chembuli/system_info/06_LLM_CONTEXT_AND_DEVELOPER_GUIDE.md)** | LLM instruction handbook: critical architectural invariants, do's and don'ts, strict rules, testing guidelines, and troubleshooting procedures. |

---

## System Quick Facts

- **Entity**: Chembuli FC (Football Club & Tournament Management Platform)
- **Primary Framework**: [TanStack Start](https://tanstack.com/start) with [TanStack Router](https://tanstack.com/router)
- **Runtime & UI**: React 19, TypeScript 5.8, Tailwind CSS v4, Vite 8, Nitro Server Engine
- **Backend Infrastructure**: Appwrite Cloud Platform (`chembuli-website`, `chembuli_db`), Appwrite Auth & Teams (Super-admin `chari` + `admins` team)
- **Transactional Email**: Gmail SMTP (`chembuli.fc@gmail.com`) via `nodemailer`
- **Automated Quality**: 36 automated tests across 6 test suites with 100% pass rate
- **Primary Repository Components**:
  - `logo/`: High-resolution official brand assets (Protected: read-only directory).
  - `website/`: Modern full-stack web application code, styles, tests, and configuration.
  - `system_info/`: Complete technical documentation suite.
