FROM node:22-slim

WORKDIR /app

# Install build tools for native modules (better-sqlite3)
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy app files
COPY . .

# Remove source maps, tests, etc.
RUN rm -rf node_modules/.cache

# Create data directory for SQLite
RUN mkdir -p /data

# Use non-root user
USER node

ENV PORT=3456
ENV DB_PATH=/data/central.db

EXPOSE 3456

CMD ["node", "server.js"]
