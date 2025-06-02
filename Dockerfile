FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY server.js .

# This volume will be mounted at runtime to persist logs
VOLUME ["/data"]

EXPOSE 3000

CMD ["npm", "start"]
