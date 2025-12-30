FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source and build
COPY tsconfig.json ./
COPY src ./src

# Install dev dependencies for build, then remove them
RUN npm install typescript && \
    npm run build && \
    npm prune --production && \
    rm -rf src tsconfig.json

# Create data directory for SQLite
RUN mkdir -p /app/data

# Set environment
ENV NODE_ENV=production

# MCP servers use stdio transport
ENTRYPOINT ["node", "dist/index.js"]
