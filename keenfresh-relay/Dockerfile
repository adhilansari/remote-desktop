FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy shared library
COPY keenfresh-shared ./keenfresh-shared

# Copy the relay application package files
COPY keenfresh-relay/package*.json ./keenfresh-relay/

# Install dependencies for shared library
WORKDIR /usr/src/app/keenfresh-shared
RUN npm install && npm run build

# Install dependencies for relay
WORKDIR /usr/src/app/keenfresh-relay
RUN npm install

# Copy the rest of the relay source code
COPY keenfresh-relay ./

# Build TypeScript code
RUN npm run build

# Expose port 3000 for the Relay
EXPOSE 3000

# Start the application
CMD [ "npm", "start" ]
