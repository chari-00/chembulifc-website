# Chembuli FC Platform

Official web platform and tournament management system for **Chembuli Football Club**, built with modern full-stack TypeScript, TanStack Start (SSR), Tailwind CSS, and Appwrite Backend-as-a-Service.

## Project Structure

- `website/` — The full-stack web application (TanStack Start, Nitro SSR, React 19, Tailwind CSS, Lucide icons, Vite).
- `system_info/` — Authoritative developer documentation suite, architectural references, API schemas, and operating runbooks.
- `appwrite.json` — Appwrite project configuration (database schemas, collections, attributes, storage buckets, and security rules).

## Documentation

For comprehensive system documentation, architecture guides, data schemas, API integrations, and developer workflows, please refer to the documentation suite in [system_info/README.md](system_info/README.md).

## Quick Start (Web App)

```bash
# Navigate to the website application directory
cd website

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your Appwrite project credentials and Gmail App Password

# Run local development server
npm run dev

# Run test suite
npm test

# Build production bundle
npm run build
```
