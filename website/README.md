# HOVR website

Next.js + shadcn/ui landing page. It renders the real HOVR components, copied from `../src` by `node scripts/sync-ui.cjs` (the copy in `src/hovr` is committed so Vercel can build from this folder alone). `src/hovr/src/lib/edge.ts` is a mock bridge and is not overwritten.

```bash
npm install
npm run dev
```

Deploy: Vercel, root directory `website`.
