# 02 — Directory & File Map

This document provides a complete scan and classification of every directory and file in the Chembuli FC project repository outside `node_modules/`.

---

## 1. Top-Level Directory Tree

```
Chembuli/
├── logo/                   # Brand and crest assets (Protected - read only)
│   ├── logo-alt.png        # Official primary club crest (used in application)
│   ├── logo-main.png       # Primary logo variation
│   ├── logo-wb(1).png      # White/Black variation 1
│   └── logo-wb(2).png      # White/Black variation 2
│
├── system_info/            # Technical documentation suite
│   ├── README.md           # Documentation index & map
│   ├── 00_OVERVIEW.md      # System overview, tech stack, quick start
│   ├── 01_ARCHITECTURE.md  # Architectural patterns, store design, Appwrite plan
│   ├── 02_DIRECTORY_AND_FILE_MAP.md # Complete repository inventory
│   ├── 03_DATA_MODELS_AND_SCHEMA.md # Type models, business invariants, validation
│   ├── 04_ROUTES_AND_PAGES.md       # Public & admin route specifications
│   ├── 05_INTEGRATIONS_AND_APIS.md  # Server functions, Gmail SMTP, telemetry
│   └── 06_LLM_CONTEXT_AND_DEVELOPER_GUIDE.md # LLM instructions & developer guide
│
└── website/                # Web application root
    ├── .gitignore          # Git exclusion rules
    ├── .lovable/           # Lovable project configuration
    │   └── project.json    # Lovable template and revision identifier
    ├── .prettierignore     # Prettier ignore patterns
    ├── .prettierrc         # Prettier formatting configuration
    ├── AGENTS.md           # Lovable & agent architecture conventions
    ├── README.md           # Project developer readme
    ├── roadmap.md          # Completed features & release changelog
    ├── bun.lock            # Bun package manager lockfile (for cloud/Lovable environments)
    ├── bunfig.toml         # Bun supply-chain guard configuration
    ├── components.json     # shadcn/ui configuration file
    ├── eslint.config.js    # Modern flat ESLint configuration
    ├── package-lock.json   # NPM package manager lockfile (for local Windows/Node environments)
    ├── package.json        # NPM package manifests, dependencies, scripts
    ├── tsconfig.json       # TypeScript compiler options & `@/*` alias mapping
    ├── vite.config.ts      # Vite bundler & TanStack Start server configuration
    ├── vitest.config.ts    # Vitest testing environment configuration
    │
    ├── public/             # Static public assets served directly
    │   ├── favicon.png     # Browser favicon
    │   ├── logo-alt.png    # Public copy of official crest
    │   └── robots.txt      # Search engine crawler instructions
    │
    └── src/                # Application source code
        ├── router.tsx          # TanStack Router instance factory
        ├── routeTree.gen.ts    # Auto-generated route tree (do not edit manually)
        ├── server.ts           # Nitro / SSR entrypoint wrapper & error handler
        ├── start.ts            # TanStack Start client bootstrapping entry
        ├── styles.css          # Global CSS, Tailwind v4 imports, design tokens
        │
        ├── assets/             # Bundled image assets
        │   ├── event-1.jpg     # Tournament poster 1 (Weekend 7s)
        │   ├── event-2.jpg     # Tournament poster 2 (Summer Cup)
        │   ├── gallery-1.jpg   # Gallery action photo 1
        │   ├── gallery-2.jpg   # Gallery action photo 2
        │   ├── gallery-3.jpg   # Gallery action photo 3
        │   ├── hero-pitch.jpg  # Landing page hero background photo
        │   └── logo-alt.png    # Primary crest bundled for import
        │
        ├── components/         # Reusable UI component libraries
        │   ├── bits/           # Kinetic & animated display components
        │   │   ├── AnimatedContent.tsx  # Scroll/mount animated container
        │   │   ├── Counter.css          # Styles for rolling counter numbers
        │   │   ├── Counter.tsx          # Kinetic number count-up animation
        │   │   ├── FlexCarousel.css     # Horizontal dynamic flex carousel styles
        │   │   ├── FlexCarousel.tsx     # Responsive drag/scroll interactive carousel
        │   │   ├── Masonry.css          # Masonry grid styles & responsive breakpoints
        │   │   ├── Masonry.tsx          # Masonry photo grid with lightbox integration
        │   │   ├── WarpText.css         # Text warping effect styles
        │   │   └── WarpText.tsx         # Athletic kinetic curved typography
        │   │
        │   ├── site/           # Chembuli site-specific layout components
        │   │   ├── EventCard.tsx        # Tournament listing card with badge & prize
        │   │   └── SiteChrome.tsx       # Global Header (nav, mobile drawer) & Footer
        │   │
        │   └── ui/             # Standard shadcn / Radix component primitives
        │       ├── accordion.tsx, alert-dialog.tsx, alert.tsx, aspect-ratio.tsx,
        │       ├── avatar.tsx, badge.tsx, breadcrumb.tsx, button.tsx, calendar.tsx,
        │       ├── card.tsx, carousel.tsx, chart.tsx, checkbox.tsx, collapsible.tsx,
        │       ├── command.tsx, context-menu.tsx, dialog.tsx, drawer.tsx, dropdown-menu.tsx,
        │       ├── form.tsx, hover-card.tsx, input-otp.tsx, input.tsx, label.tsx,
        │       ├── menubar.tsx, navigation-menu.tsx, pagination.tsx, popover.tsx, progress.tsx,
        │       ├── radio-group.tsx, resizable.tsx, scroll-area.tsx, select.tsx, separator.tsx,
        │       ├── sheet.tsx, sidebar.tsx, skeleton.tsx, slider.tsx, sonner.tsx, switch.tsx,
        │       └── table.tsx, tabs.tsx, textarea.tsx, toggle-group.tsx, toggle.tsx, tooltip.tsx
        │
        ├── data/               # Static models, seed data, and business rules
        │   ├── blog.ts         # Blog post interface, block types, blankPost, publicPosts
        │   └── events.ts       # Event interfaces, status derivation, color generator,
        │                       # reference allocator, validation, default seed data
        │
        ├── hooks/              # Custom React hooks
        │   └── use-mobile.tsx  # Responsive viewport breakpoint detection (< 768px)
        │
        ├── lib/                # Utility modules, storage layer, and server functions
        │   ├── admin-users.functions.ts  # Super-admin user management server functions
        │   ├── appwrite.ts               # Appwrite Client, Databases, Storage, Account setup
        │   ├── csv-export.ts             # RFC 4180 CSV generation & client-side download utility
        │   ├── email.functions.ts        # Gmail SMTP createServerFn
        │   ├── error-capture.ts          # Out-of-band error recorder for SSR
        │   ├── error-page.ts             # HTML error page renderer for server crashes
        │   ├── lovable-error-reporting.ts # React Error Boundary reporter
        │   ├── page-head.ts              # SEO metadata helper functions
        │   ├── store.ts                  # Reactive data store with audit logging helpers
        │   └── utils.ts                  # shadcn `cn()` clsx/tailwind-merge helper
        │
        ├── routes/             # TanStack Start file-based route definitions
        │   ├── README.md               # Route naming conventions guide
        │   ├── __root.tsx              # Root HTML shell, global head, toast container
        │   ├── index.tsx               # Public Home / Landing page
        │   ├── events.index.tsx        # Public Tournaments list page
        │   ├── events.$slug.tsx        # Public Single Tournament & Registration page
        │   ├── gallery.tsx             # Public Match Photo Gallery page
        │   ├── blog.index.tsx          # Public Blog list page
        │   ├── blog.$id.tsx            # Public Single Article Reader page
        │   ├── admin.tsx               # Admin layout & Appwrite session authentication
        │   ├── admin.index.tsx         # Admin tournaments overview table
        │   ├── admin.events.$id.tsx    # Admin tournament editor, registration & ref audit
        │   ├── admin.gallery.tsx       # Admin match photo manager
        │   ├── admin.blog.tsx          # Admin blog posts list
        │   ├── admin.blog_.$id.tsx     # Admin block-based article composer
        │   ├── admin.users.tsx         # Super-admin administrator management console
        │   └── admin.history.tsx       # Comprehensive audit log & action history viewer
        │
        └── test/               # Vitest automated test suite
            ├── app-routing.test.tsx    # Route creation and slug routing verification
            ├── blog-rules.test.tsx     # Draft vs published filtering test
            ├── csv-export.test.ts      # CSV generation, escaping, and column order tests
            ├── email-dispatch.test.ts  # Gmail SMTP validation and graceful degradation tests
            ├── events-rules.test.tsx   # Comprehensive tournament business logic tests
            ├── superadmin.test.tsx     # Role guard and hard-lock verification tests
            └── setup.ts                # Test runner polyfills and DOM mocks
```

---

## 2. File Classifications & Modification Policies

| Category | Policy | Notes |
| :--- | :--- | :--- |
| `logo/*` | **STRICT READ-ONLY** | Original high-resolution branding assets. Never edit, rename, or delete anything inside this directory. |
| `website/src/routeTree.gen.ts` | **AUTO-GENERATED** | Generated automatically by the TanStack Router Vite plugin when files in `src/routes/` are modified. Do not edit manually. |
| `website/src/lib/store.ts` | **PERSISTENCE CORE** | Single boundary for all reads and writes. To be swapped for Appwrite SDK in backend migration. |
| `website/src/styles.css` | **DESIGN TOKENS** | Contains global colors, custom scrollbars, athletic diagonal cut utilities (`clip-diag`), and glassmorphism definitions. |
| `system_info/*` | **DOCUMENTATION** | Authoritative developer and LLM knowledge base. Keep synchronized when features change. |
