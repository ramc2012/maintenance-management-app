FROM node:20-alpine AS build

WORKDIR /app

ARG EXPO_PUBLIC_API_URL=/api
ARG EXPO_PUBLIC_COGNITIVE_API_URL=/cognitive
ARG EXPO_PUBLIC_COGNITIVE_MODEL=gemma4:e4b

ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
ENV EXPO_PUBLIC_COGNITIVE_API_URL=${EXPO_PUBLIC_COGNITIVE_API_URL}
ENV EXPO_PUBLIC_COGNITIVE_MODEL=${EXPO_PUBLIC_COGNITIVE_MODEL}

COPY package*.json ./
RUN npm install

COPY . .
RUN npx expo export --platform web

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
