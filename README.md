This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## AI and receipt privacy

Receipt uploads are stored in the user's Supabase Storage account. The server downloads the image and may send it to free-tier Groq, Gemini or OpenRouter models. Independent OCR.space processing receives image data or a temporary signed Storage URL (180 seconds). Receipt analysis may also send OCR text, category names and the supplied card IDs/names/types to AI. Chat sends the conversation and monthly financial totals/category summaries to the configured AI providers. Providers process these outside this app; their own terms and retention policies apply. Thai/English notices appear at receipt upload and in the assistant. Check extracted results before saving. Provider selection is unchanged. Never put images, receipt text, request bodies, credentials or signed URLs in logs.

AI endpoints enforce authenticated per-user hourly quotas: chat 30, financial analysis 20, receipt analysis 40, OCR 20. Configuration lives in lib/api/rateLimitPolicy.ts. The quota RPC identifies the caller using auth.uid(); authenticated clients cannot access the quota table directly. Quota service errors fail open with a generic server log; known quota denials return 429 and Retry-After. The new migration must be reviewed and applied separately before quotas are active.
