FROM node:18-alpine

WORKDIR /app

# Copy package.json files
COPY keenfresh-shared/package.json ./keenfresh-shared/
COPY keenfresh-relay/package.json ./keenfresh-relay/

# Install dependencies in each folder
RUN cd keenfresh-shared && npm install
RUN cd keenfresh-relay && npm install

# Copy source code
COPY keenfresh-shared/ ./keenfresh-shared/
COPY keenfresh-relay/ ./keenfresh-relay/

# Build shared and relay
RUN cd keenfresh-shared && npm run build
RUN cd keenfresh-relay && npm run build

# Expose Relay port
EXPOSE 3000

# Start the Relay Server
CMD ["node", "keenfresh-relay/dist/index.js"]
