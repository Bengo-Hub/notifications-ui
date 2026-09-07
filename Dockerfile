# Base image
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10

# Copy package files and pnpm config
# .npmrc provides shamefully-hoist=true for proper module resolution
COPY package.json pnpm-lock.yaml* .npmrc* ./

# Install without --frozen-lockfile so pnpm.overrides in package.json apply.
# pnpm.overrides pins side-channel to 1.0.6, avoiding the missing
# side-channel-list transitive dependency from side-channel@1.1.0.
RUN pnpm install --shamefully-hoist --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
RUN npm install -g pnpm@10
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time args for Next.js
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# WhatsApp Embedded Signup (use-whatsapp-embedded-signup.ts) — Meta App ID and the Embedded
# Signup config_id (App Dashboard -> WhatsApp -> Embedded Signup -> Configurations). Not secrets:
# both are meant to be read by the client-side Meta JS SDK, the same way a public API key is.
# Defaulted here (not routed through build.sh/GitHub secrets) since nothing else in the build
# pipeline currently overrides them.
ARG NEXT_PUBLIC_META_APP_ID=1795331208142018
ENV NEXT_PUBLIC_META_APP_ID=${NEXT_PUBLIC_META_APP_ID}
ARG NEXT_PUBLIC_META_WHATSAPP_CONFIG_ID=1588908702785574
ENV NEXT_PUBLIC_META_WHATSAPP_CONFIG_ID=${NEXT_PUBLIC_META_WHATSAPP_CONFIG_ID}

RUN pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir -p .next .next/static
RUN chown nextjs:nodejs .next

# Standalone output - server.js + static assets (no full node_modules needed)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
