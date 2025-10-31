# TODO: Cloudflare Migration

## Front-end: Static Build for Cloudflare Pages
- [x] Update Next.js configuration for static export
  - [x] Set `output: 'export'` in `next.config.mjs`
  - [x] Verify `next/image` usage and adjust to static-friendly alternatives if needed
- [x] Create API base URL abstraction
  - [x] Implement helper to resolve `NEXT_PUBLIC_API_BASE_URL` with sensible defaults
  - [x] Replace all `/api/videos/*` fetch calls to use the helper
  - [x] Ensure TypeScript types reflect new helper usage
- [x] Update build and deployment scripts
  - [x] Adjust `package.json` scripts to run static export before deploy
  - [x] Document local static preview workflow (e.g., `npx serve out`)
- [x] Audit environment variables
  - [x] Ensure `NEXT_PUBLIC_API_BASE_URL` is documented for Pages deployment
  - [x] Provide guidance for local dev vs. production values

## Backend: Cloudflare Worker API Proxy
- [x] Scaffold Worker project structure
  - [x] Add `wrangler.toml` with routes for `/videos/*`
  - [x] Create Worker entry file (TypeScript preferred)
  - [x] Configure build command (esbuild/wrangler) for TypeScript
- [x] Implement endpoints mirroring current Next.js API routes
  - [x] `/videos/create` to forward multipart form data to OpenAI
    - [x] Validate request size and required fields
    - [x] Stream response back to client with appropriate status handling
  - [x] `/videos/status` to proxy polling requests
    - [x] Preserve retry logic and 5xx handling semantics
  - [x] `/videos/download` to return base64 media payloads
    - [x] Implement `arrayBufferToBase64` helper without Node `Buffer`
  - [x] `/videos/list` and `/videos/delete` passthrough implementations
  - [x] `/videos/remix` JSON passthrough implementation
- [x] Shared Worker utilities
  - [x] Create helper for forwarding headers (e.g., `Authorization`)
  - [x] Centralize JSON error responses and logging
  - [x] Add CORS headers and OPTIONS handling for each route
- [x] Secrets and configuration
  - [x] Confirm no server-side OpenAI keys are stored; document expectation for client-provided keys
  - [x] Note Cloudflare Worker limits (upload size, execution time) in docs

## Integration & Deployment
- [x] Local development workflow
  - [x] Document running `wrangler dev` alongside `next dev`
  - [x] Configure `.env.local` to point to local Worker (`http://127.0.0.1:8787`)
- [x] Production deployment steps
  - [x] Configure Cloudflare Pages project to serve static `out/` directory
  - [x] Deploy Worker and bind to `/api/videos/*` via routes or Pages Functions
  - [x] Set `NEXT_PUBLIC_API_BASE_URL` in Pages environment to Worker URL
- [x] Continuous deployment pipeline
  - [x] Update CI to build static site and deploy Worker
  - [x] Add validation steps (lint/build) before deployment

## Documentation & Testing
- [x] Update README with Cloudflare deployment instructions
  - [x] Include environment variable descriptions
  - [x] Add troubleshooting tips for CORS and file-size limits
- [x] Add section detailing Worker architecture and endpoints
- [x] Testing plan
  - [x] Define manual QA checklist covering creation, status polling, download, delete, remix
  - [x] Consider automated smoke tests hitting Worker endpoints via Pages-hosted UI
