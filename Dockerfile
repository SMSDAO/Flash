# ==============================================================================
# Phase 3: Automated Docker Deployment - Enterprise Daemon Image
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependency files first for layer caching
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# ==============================================================================
# Production Runner Image
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HEALTH_PORT=8080

# Install wget and dumb-init for proper PID 1 signal handling
RUN apk add --no-cache dumb-init wget

# Copy installed node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Copy runtime daemon script and contracts
COPY daemon.js ./
COPY contracts/ ./contracts/

# Use unprivileged node user
USER node

# Expose internal telemetry and healthcheck port
EXPOSE 8080

# Cloud healthcheck probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/health || exit 1

# Launch with dumb-init for graceful SIGINT/SIGTERM shutdown
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "daemon.js"]
