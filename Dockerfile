FROM node:24-alpine
WORKDIR /K6

COPY package.json package-lock.json ./
COPY K6 ./
COPY --from=grafana/k6 /usr/bin/k6 /usr/bin/k6

RUN npm ci --omit=dev 
