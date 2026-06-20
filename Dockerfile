FROM node:18-alpine

WORKDIR /app

# Copy package.json files
COPY package.json ./
COPY flaro-shared/package.json ./flaro-shared/
COPY flaro-relay/package.json ./flaro-relay/

# Install dependencies (workspaces will link shared to relay)
RUN npm install

# Copy source code
COPY flaro-shared/ ./flaro-shared/
COPY flaro-relay/ ./flaro-relay/

# Build shared and relay
RUN cd flaro-shared && npm run build
RUN cd flaro-relay && npm run build

# Expose Relay port
EXPOSE 3000

# Start the Relay Server
CMD ["node", "flaro-relay/dist/server.js"]
