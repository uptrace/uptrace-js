FROM node:12 AS base
COPY . /src/
WORKDIR /src/example/express

FROM base AS express-server
RUN yarn install
CMD ["node", "main.js"]
