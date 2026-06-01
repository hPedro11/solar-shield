FROM node:20-alpine

WORKDIR /app

# Instala dependencias primeiro (cache de layer)
COPY package*.json ./
RUN npm install --omit=dev

# Copia codigo
COPY src ./src

EXPOSE 3001

CMD ["node", "src/index.js"]
