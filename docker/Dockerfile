FROM node:22-alpine

# Install dependencies for native modules
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Hardhat and dependencies
RUN npm install --save-dev \
    hardhat@^2.22.18 \
    @nomicfoundation/hardhat-toolbox@^5.0.0 \
    @nomicfoundation/hardhat-ethers@^3.0.0 \
    ethers@^6.15.0 \
    dotenv@^16.4.7 \
    @openzeppelin/contracts@^5.0.0 \
    @openzeppelin/contracts-upgradeable@^5.0.0 \
    @openzeppelin/hardhat-upgrades@^3.6.0

# Copy project files
COPY hardhat.config.js ./
COPY contracts ./contracts
COPY scripts ./scripts
COPY test ./test

# Expose Hardhat node port
EXPOSE 8545

# Default command: run Hardhat node
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
