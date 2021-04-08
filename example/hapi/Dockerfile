FROM node:12 AS base
COPY . /src/
WORKDIR /src/example/hapi

FROM base AS hapi-server
RUN yarn install
CMD ["node", "main.js"]
