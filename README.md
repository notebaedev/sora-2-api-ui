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

**Progress stuck:**
- Be patient - generation can take several minutes
- Check your internet connection
- Refresh the page and check the video list

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
