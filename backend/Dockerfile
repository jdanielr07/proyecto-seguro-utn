FROM node:20-alpine

RUN apk add --no-cache openssl
# Crear usuario sin privilegios (no correr como root)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copiar dependencias primero (cache de Docker)
COPY package*.json ./
RUN npm install --only=production

# Copiar el resto del código
COPY . .

# Generar cliente Prisma
RUN npx prisma generate

# Cambiar ownership al usuario sin privilegios
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
