FROM node:24.22.3-alpine AS build
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

# VITE_* values are public: Vite inlines them into the bundle, so never pass a secret here.
# The URL must be reachable from the user's browser, not a Docker-internal service name.
ARG VITE_CONVEX_URL
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL
RUN npm run build

FROM nginx:1.30.7-alpine-slim AS runtime

# ARG values do not cross stages. A https:// CSP source does not cover wss://, and Convex syncs
# over a WebSocket, so connect-src gets both forms of the backend URL.
ARG VITE_CONVEX_URL
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
RUN set -eu; \
    src="${VITE_CONVEX_URL:-}"; \
    if [ -n "$src" ]; then src="$src ws${src#http}"; fi; \
    sed -i "s|__CSP_CONNECT_SRC__|$src|" /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
