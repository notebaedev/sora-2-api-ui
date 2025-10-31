# Sora 2 API UI

A modern, responsive web interface for OpenAI's Sora 2 Video API. Generate stunning videos from text prompts with an intuitive UI.

## Features

- 🎥 **Video Generation**: Create videos from text prompts using Sora 2 or Sora 2 Pro
- ✨ **Remix Videos**: Make targeted adjustments to completed videos without starting from scratch
- 🖼️ **Image References**: Upload reference images to guide video generation
- 💰 **Cost Tracking**: Real-time cost estimates and session total tracking
- 📊 **Real-time Progress**: Monitor video generation progress with live updates
- 🎬 **Video Management**: View, download, and delete generated videos
- 💾 **Local Storage**: API key is securely stored in your browser
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🎨 **Modern UI**: Built with TailwindCSS and shadcn/ui components
- 🔄 **Smart Error Handling**: Automatic retry logic for temporary API errors

## Getting Started

### Prerequisites

- Node.js 18+ installed
- An OpenAI API key with access to the Sora 2 API

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd sora-2-api-ui
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (optional for local dev):
   - Copy `.env.example` to `.env.local`:
     ```bash
     cp .env.example .env.local
     ```
   - For local Next.js development the default value points to the built-in API routes, so you can leave the value commented out unless you are testing against a remote Worker.

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Static build & preview (Cloudflare Pages)

1. Generate the static build:
   ```bash
   npm run build
   ```
   This runs `next build` followed by `next export` to produce the static site in the `out/` directory.

2. Preview the exported site locally:
   ```bash
   npm run preview:static
   ```
   This command serves the contents of `out/` on a local development server so you can verify the static output before deploying to Cloudflare Pages.

### Environment variables

| Variable | Required | Description | Local value | Production (Cloudflare Pages) |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Optional for local Next.js dev | Base URL for all `/api/videos/*` requests from the browser. | Leave unset to default to the local Next.js API routes (`/api`). Set to `http://127.0.0.1:8787` when developing against a local Worker (`wrangler dev`). | Set to the deployed Worker URL (e.g., `https://<your-worker>.workers.dev` or the Pages Functions route) so the static site calls the Worker endpoints. |

## Cloudflare deployment

### Architecture overview

The Cloudflare deployment runs as two artifacts:

- **Static UI on Cloudflare Pages** – the Next.js project is exported with `next export` and hosted as static assets.
- **API proxy Worker** – a Cloudflare Worker handles all `/api/videos/*` requests, forwarding them to OpenAI's Video API using the requesting user's API key.

### Worker endpoints

| Route | Method | Description |
| --- | --- | --- |
| `/videos/create` | `POST` | Accepts multipart form data and forwards generation requests to `POST https://api.openai.com/v1/videos`. Validates payload size (25MB limit) before proxying. |
| `/videos/status` | `POST` | Proxies polling requests to `GET https://api.openai.com/v1/videos/:id` and preserves retry semantics for 5xx errors. |
| `/videos/download` | `POST` | Fetches binary content from OpenAI, converts to Base64 inside the Worker, and returns it with the original content type. |
| `/videos/list` | `POST` | Passes through list queries to `GET https://api.openai.com/v1/videos` with pagination params. |
| `/videos/delete` | `POST` | Deletes a video via `DELETE https://api.openai.com/v1/videos/:id`. |
| `/videos/remix` | `POST` | Forwards remix prompts to `POST https://api.openai.com/v1/videos/:id/remix`. |

Every endpoint normalizes headers, forwards the `Authorization` token supplied in the request body, adds Cloudflare-compatible CORS headers, and returns structured JSON errors for easier debugging.

### Shared Worker utilities

The Worker implementation introduces shared helpers for:

- **Header forwarding** – ensures the `Authorization` header is present on each OpenAI request without persisting any secrets.
- **CORS** – applies a consistent set of CORS headers (including `OPTIONS` preflight support) across every route.
- **Error responses** – centralizes JSON error payloads and logging so client errors and server retries are clearly surfaced.
- **Binary conversion** – provides an `arrayBufferToBase64` helper that avoids Node.js-only APIs for compatibility with Workers.

### Secrets and platform limits

- The Worker never stores OpenAI API keys; the client must supply the key with each request.
- Document Cloudflare's platform limits for stakeholders: Workers currently allow requests up to 25MB, 30-second CPU time on the paid plan, and 10-second CPU time on the free plan. Exceeding these constraints results in descriptive error payloads surfaced by the shared error handler.

### Local development workflow

1. Start the Next.js app:
   ```bash
   npm run dev
   ```
2. In a second terminal, launch the Worker in dev mode:
   ```bash
   npm run worker:dev
   ```
   The Worker listens on `http://127.0.0.1:8787`.
3. Create or update `.env.local` to point the UI at the Worker:
   ```env
   NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:8787"
   ```
4. Visit `http://localhost:3000` and interact with the UI; API traffic proxies through the local Worker instance.

### Production deployment steps

1. **Cloudflare Pages** – configure the project to publish the `out/` directory generated by `npm run build`.
2. **Worker deployment** – deploy the Worker with `npm run worker:deploy`. Update the route in `wrangler.toml` to match your production domain (e.g., `example.com/api/videos/*`).
3. **Pages environment variable** – set `NEXT_PUBLIC_API_BASE_URL` to the public Worker URL (Workers.dev subdomain or the bound route).
4. **Route binding** – in Cloudflare, ensure `/api/videos/*` requests route to the Worker so the static UI and API proxy share a single hostname.

### Continuous deployment pipeline

When adding CI/CD, incorporate the following stages:

1. Run validation (`npm run lint` and `npm run build`) to ensure the UI exports correctly.
2. Bundle the Worker via `npm run worker:build` (Wrangler dry-run) to catch type or syntax errors.
3. Publish the static export to Cloudflare Pages.
4. Deploy the Worker and verify the route binding as part of the same pipeline, using environment-specific configuration for secrets and routes.

### Troubleshooting deployment issues

- **CORS preflight failures** – confirm the Worker route is reachable and that requests include `Access-Control-Request-Headers`. The Worker automatically mirrors requested headers in the response.
- **Payload too large** – uploads above 25MB are rejected before reaching OpenAI. Reduce reference image size or duration and retry.
- **Worker timeouts** – OpenAI requests that exceed Cloudflare's execution limits return a retriable error message surfaced to the UI; consider rerunning or upgrading to a plan with higher limits if this persists.

### Usage

1. **Enter your API Key**: Input your OpenAI API key in the configuration panel. It will be saved locally in your browser.

2. **Configure Generation Settings**:
   - Choose between `sora-2` (fast) or `sora-2-pro` (high quality)
   - Select resolution (720p, 1080p, portrait modes)
   - Choose duration (4s, 8s, or 12s)

3. **Create Your Prompt**: Describe the video you want to generate. Be specific about:
   - Shot type (wide shot, close-up, etc.)
   - Subject and action
   - Setting and environment
   - Lighting and mood

4. **Optional Image Reference**: Upload a reference image to use as the first frame

5. **Cost Estimate**: See the estimated API cost before generating

6. **Generate**: Click the "Generate Video" button and watch the progress

7. **View & Download**: Once complete, view the video inline or download it as an MP4

8. **Remix Videos**: Click "Remix" on any completed video to make targeted changes:
   - Best for single, focused edits (color palette, lighting, mood)
   - Preserves original structure and composition
   - Costs the same as generating a new video with the same settings

## Project Structure

```
sora-2-api-ui/
├── app/
│   ├── api/
│   │   └── videos/          # API routes for video operations
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main page component
├── components/
│   └── ui/                  # Reusable UI components
├── lib/
│   ├── api.ts               # API base URL helpers
│   └── utils.ts             # Utility functions
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.mjs
```

## API Endpoints

- `POST /api/videos/create` - Start a new video generation
- `POST /api/videos/remix` - Remix an existing completed video
- `POST /api/videos/status` - Check video generation status
- `POST /api/videos/download` - Download video or thumbnail
- `POST /api/videos/list` - List all videos
- `POST /api/videos/delete` - Delete a video

## Technologies Used

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **shadcn/ui** - UI components
- **Lucide React** - Icons
- **OpenAI SDK** - API integration

## Tips for Best Results

### Video Generation
1. **Be Specific**: Include details about camera angles, lighting, and motion
2. **Use sora-2** for quick iterations and testing
3. **Use sora-2-pro** for final, production-quality renders
4. **Reference Images**: Must match your target resolution
5. **Content Guidelines**: Avoid copyrighted content, real people, and content unsuitable for under-18 audiences

### Remixing Videos
1. **Single Changes**: Make one focused edit at a time (color palette, lighting, mood)
2. **Small Steps**: Multiple small remixes preserve more fidelity than one large change
3. **Be Precise**: Clearly describe the specific adjustment you want
4. **Example Prompts**:
   - "Shift the color palette to teal, sand, and rust"
   - "Add warm backlight and golden hour atmosphere"
   - "Change to a moody, noir-style lighting"

## Troubleshooting

**Video generation fails:**
- Verify your API key is correct and has Sora 2 access
- Check that your prompt follows content guidelines
- Ensure reference images match the target resolution
- For Cloudflare deployments, confirm the Worker route is correctly bound and that `NEXT_PUBLIC_API_BASE_URL` points to it

**Progress stuck:**
- Be patient - generation can take several minutes
- Check your internet connection
- Refresh the page and check the video list

**CORS or preflight errors:**
- Verify the Worker is responding with the expected CORS headers (use browser dev tools)
- Double-check that the request includes `Content-Type` and other custom headers in the preflight request

**Payload too large when uploading:**
- Reference images above 25MB are rejected by Cloudflare Workers; compress or resize before uploading

## Testing plan

### Manual QA checklist

- Generate a new video (with and without an image reference) and verify status polling updates in the UI.
- Poll the `/videos/status` route until completion and observe the retry behavior when forcing a temporary error (e.g., simulate a 5xx response in dev tools).
- Download each variant (video, thumbnail, spritesheet) and confirm Base64 responses decode correctly in the browser.
- Remix an existing video and ensure the new job appears with the proper lineage and cost tracking.
- List and delete videos, confirming the Worker forwards pagination parameters and handles deletion responses.

### Future automated smoke tests

- Add lightweight integration tests that run against a staging Worker using mock credentials to validate 200/4xx/5xx responses for each endpoint.
- Automate UI smoke tests (Playwright/Cypress) to hit the deployed Pages site and ensure Worker routing behaves as expected after each deploy.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
