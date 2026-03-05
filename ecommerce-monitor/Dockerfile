FROM mcr.microsoft.com/playwright:v1.58.2-focal

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

RUN mkdir -p data/screenshots

EXPOSE 3000

CMD ["node", "server/index.js"]
