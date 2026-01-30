# STAGE 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files and lockfile
COPY package.json pnpm-lock.yaml* ./

# Install ALL dependencies (including devDependencies for the build)
RUN pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the application
# We need to set dummy values for static env vars if any (none in this project so far)
RUN pnpm run build

# STAGE 2: Runtime
FROM node:22-alpine AS runner

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package.json
COPY package.json ./

# Install only production dependencies
# This keeps the final image size small
RUN pnpm install --prod

# Copy the built application from the builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/src/lib/server/db/migrate.js ./scripts/migrate.js

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV MIGRATIONS_PATH=/app/drizzle

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "build/index.js"]
