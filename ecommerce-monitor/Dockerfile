FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

# Copy package files and install
COPY package.json ./
RUN npm install

# Copy app code
COPY . .

# Create data directory
RUN mkdir -p data/screenshots

# Expose dashboard port
EXPOSE 3000

# Start server (includes built-in cron scheduler)
CMD ["node", "server/index.js"]
