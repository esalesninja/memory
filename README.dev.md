# Memory — Developer Guide

Internal documentation for developing and publishing `esalesninja/memory`.

For end-user documentation, see [README.md](README.md).

---

## Repository Layout

```
plugins/esalesninja/memory/
├── .lmstudio/
│   ├── entry.ts          # LM Studio plugin bootstrap (dev)
│   └── production.js     # Bundled production build (generated, published)
├── .lmsignore            # Controls what lms push uploads
├── src/                  # TypeScript source (not published)
├── manifest.json
├── package.json
├── README.md             # User-facing docs (published)
└── README.dev.md         # This file (not published)
```

---

## Architecture

### Components

| File | Role |
|------|------|
| `src/index.ts` | Plugin entry — registers preprocessor, tools, config |
| `src/preprocessor.ts` | Auto-injects memories + handles `remember:` |
| `src/toolsProvider.ts` | Six memory tools (read/write/remove × global/chat) |
| `src/memoryStore.ts` | Line-based file I/O for `~/.lmstudio/memories/` |
| `src/chatContext.ts` | Resolves chat id/name and memory file paths |
| `src/config.ts` | Plugin settings schema |
| `src/constants.ts` | Paths and tuning constants |

### Chat ID resolution

The LM Studio SDK does not expose `chat_id` or `chat_name` directly.

| Field | Source |
|-------|--------|
| **Chat ID** | `path.basename(ctl.getWorkingDirectory())` |
| **Chat name** | `name` in `~/.lmstudio/conversations/<chatId>.conversation.json` |

Memory files use `<chatId>_<chatName>.md`, with `unnamed` when no name is set. Files are renamed when a chat gets a name later.

### Prompt injection

The preprocessor prepends memory blocks and tool instructions before the user message, separated by `---`. Injection is throttled to every 15 minutes unless memories change.

---

## Development

### Prerequisites

- [LM Studio](https://lmstudio.ai/)
- [lms CLI](https://lmstudio.ai/docs/developer)
- Node.js

### Setup

```bash
cd plugins/esalesninja/memory
npm install
```

### Local development

```bash
npm run dev
```

Compiles TypeScript (`tsc`) then starts the plugin dev server. The LM Studio entry loads `dist/index.js`, so run `npm run build` (or `tsc`) after editing `src/`.

### Install locally

```bash
npm run build:production
```

Builds `dist/`, bundles `.lmstudio/production.js` to import compiled JS, and installs to `~/.lmstudio/extensions/plugins/esalesninja/memory/`.

---

## Publishing (production-only)

**Source code is not published.** Only the bundled production artifact and user-facing files are pushed to LM Studio Hub.

### What gets pushed

Controlled by `.lmsignore`:

| Published | Excluded |
|-----------|----------|
| `manifest.json` | `src/` |
| `package.json` | `scripts/` |
| `README.md` | `tsconfig.json`, `README.dev.md` |
| `dist/` (compiled JS) | `node_modules/` |
| `.lmstudio/production.js` | |
| `.lmstudio/entry.ts` | |

### Build production bundle

```bash
npm run build:production
```

This runs TypeScript compile, installs via `lms dev --install` (which bundles the plugin), and copies `production.js` back into `.lmstudio/`.

### Push to Hub

```bash
npm run push
```

This builds a `release/` folder with compiled `dist/` only (no TypeScript source), then runs `lms push` from there.

To preview files first:

```bash
npm run build:release
cd release && lms push
```

### Private publish

```bash
lms push --private -y
```

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run build:production` | Generate `.lmstudio/production.js` |
| `npm run dev` | Build + start dev server |
| `npm run push` | Build production + push to Hub |

---

## License

BSD 3-Clause — see [LICENSE](LICENSE).
