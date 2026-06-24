FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source code
COPY . .

# Expose backend port
EXPOSE 3002

# Start server
CMD ["node", "server.js"]
