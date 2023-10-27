FROM node:18

WORKDIR /usr/src/eazyrooms_livechat_service

COPY package*.json ./

COPY . .

RUN npm install

EXPOSE 3011

CMD ["node", "server.js"]