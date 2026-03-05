FROM node:20-alpine

WORKDIR /app

COPY package*.json yarn.lock* ./
RUN yarn install --production --frozen-lockfile

COPY dist ./dist

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/index.js"]
