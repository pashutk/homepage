# Use Node.js LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application files
COPY server.js ./
COPY api ./api
COPY index.html ./

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Run the server
CMD ["node", "server.js"]
