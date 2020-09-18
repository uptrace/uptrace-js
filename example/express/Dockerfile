FROM node:12 AS base
COPY . /src/
WORKDIR /src

FROM base AS express-server
RUN yarn install
CMD ["node", "app.js"]
