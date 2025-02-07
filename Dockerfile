# --- BUILD STAGE ---
FROM node:22-slim AS builder

# Install pnpm globally
RUN npm install -g pnpm

# Install necessary build tools
RUN apt-get update && apt-get install -y python3 make g++ curl

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Add cargo to PATH
ENV PATH="/root/.cargo/bin:${PATH}"

# Set the working directory
WORKDIR /app

# Copy package.json and other configuration files
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.json ./

# Copy the rest of the application code
COPY ./src ./src

# Install dependencies
RUN pnpm install

ENV RUSTFLAGS="-C target-feature=-crt-static"

# Build the tokenizers library
RUN cd /app/node_modules/.pnpm/@anush008+tokenizers@0.0.0/node_modules/@anush008/tokenizers/ && cargo build --release

#  Copy the built .so to the correct location.  Using a more robust approach:
RUN mkdir -p /app/dist
RUN cp /app/node_modules/.pnpm/@anush008+tokenizers@0.0.0/node_modules/@anush008/tokenizers/target/release/libanush008_tokenizers.so /app/dist/tokenizers.linux-arm64-gnu.node


# --- RUNTIME STAGE ---
FROM node:22-slim

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /app

# Copy only the necessary files from the builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile  # Install only production dependencies

COPY --from=builder /app/src ./src
COPY --from=builder /app/dist/tokenizers.linux-arm64-gnu.node ./node_modules/.pnpm/@anush008+tokenizers@0.0.0/node_modules/@anush008/tokenizers/tokenizers.linux-arm64-gnu.node
CMD ["pnpm", "start"]
