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
- [ ] Scaffold Worker project structure
  - [ ] Add `wrangler.toml` with routes for `/videos/*`
  - [ ] Create Worker entry file (TypeScript preferred)
  - [ ] Configure build command (esbuild/wrangler) for TypeScript
- [ ] Implement endpoints mirroring current Next.js API routes
  - [ ] `/videos/create` to forward multipart form data to OpenAI
    - [ ] Validate request size and required fields
    - [ ] Stream response back to client with appropriate status handling
  - [ ] `/videos/status` to proxy polling requests
    - [ ] Preserve retry logic and 5xx handling semantics
  - [ ] `/videos/download` to return base64 media payloads
    - [ ] Implement `arrayBufferToBase64` helper without Node `Buffer`
  - [ ] `/videos/list` and `/videos/delete` passthrough implementations
  - [ ] `/videos/remix` JSON passthrough implementation
- [ ] Shared Worker utilities
  - [ ] Create helper for forwarding headers (e.g., `Authorization`)
  - [ ] Centralize JSON error responses and logging
  - [ ] Add CORS headers and OPTIONS handling for each route
- [ ] Secrets and configuration
  - [ ] Confirm no server-side OpenAI keys are stored; document expectation for client-provided keys
  - [ ] Note Cloudflare Worker limits (upload size, execution time) in docs

## Integration & Deployment
- [ ] Local development workflow
  - [ ] Document running `wrangler dev` alongside `next dev`
  - [ ] Configure `.env.local` to point to local Worker (`http://127.0.0.1:8787`)
- [ ] Production deployment steps
  - [ ] Configure Cloudflare Pages project to serve static `out/` directory
  - [ ] Deploy Worker and bind to `/api/videos/*` via routes or Pages Functions
  - [ ] Set `NEXT_PUBLIC_API_BASE_URL` in Pages environment to Worker URL
- [ ] Continuous deployment pipeline
  - [ ] Update CI to build static site and deploy Worker
  - [ ] Add validation steps (lint/build) before deployment

## Documentation & Testing
- [ ] Update README with Cloudflare deployment instructions
  - [ ] Include environment variable descriptions
  - [ ] Add troubleshooting tips for CORS and file-size limits
- [ ] Add section detailing Worker architecture and endpoints
- [ ] Testing plan
  - [ ] Define manual QA checklist covering creation, status polling, download, delete, remix
  - [ ] Consider automated smoke tests hitting Worker endpoints via Pages-hosted UI
