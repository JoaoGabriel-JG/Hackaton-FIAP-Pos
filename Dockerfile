# Minimal image for CI/local smoke; extend when apps ship artifacts.
FROM node:22-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages ./packages

RUN npm ci --omit=dev

# Placeholder until deployable entrypoints exist
CMD ["node", "-e", "console.log('jaum: add CMD when apps are packaged')"]
