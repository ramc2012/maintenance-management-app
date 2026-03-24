FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

# VERIFY SCHEMA: Fail if Company is missing
RUN grep "model Company" prisma/schema.prisma

RUN npm install

# GENERATE
RUN npx prisma generate

# VERIFY CLIENT: Fail if Company is missing in generated types
RUN grep "Company" node_modules/.prisma/client/index.d.ts

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm start"]
