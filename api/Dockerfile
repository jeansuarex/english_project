FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src/ ./src/
RUN bun install
EXPOSE 3001
CMD ["bun", "run", "src/index.ts"]
