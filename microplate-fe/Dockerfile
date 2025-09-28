# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Production stage
FROM nginx:alpine AS production

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy environment template (will be overridden by docker-compose)
COPY env.example /usr/share/nginx/html/.env.template

# Create a script to inject environment variables at runtime
RUN echo '#!/bin/sh' > /docker-entrypoint.d/30-inject-env.sh && \
    echo 'set -e' >> /docker-entrypoint.d/30-inject-env.sh && \
    echo 'if [ -f /usr/share/nginx/html/.env ]; then' >> /docker-entrypoint.d/30-inject-env.sh && \
    echo '  echo "Injecting environment variables..."' >> /docker-entrypoint.d/30-inject-env.sh && \
    echo '  envsubst < /usr/share/nginx/html/.env.template > /usr/share/nginx/html/.env' >> /docker-entrypoint.d/30-inject-env.sh && \
    echo 'fi' >> /docker-entrypoint.d/30-inject-env.sh && \
    chmod +x /docker-entrypoint.d/30-inject-env.sh

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
