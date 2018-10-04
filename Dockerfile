FROM node:10-alpine

WORKDIR /app

# Directories
ADD contracts /app/contracts
ADD migrations /app/migrations
ADD test /app/test

# Files
ADD .babelrc /app/.babelrc
ADD .solcover.js /app/.solcover.js
ADD package.json /app/package.json
ADD truffle.js /app/truffle.js
ADD truffle-config.js /app/truffle-config.js

# Dependencies
RUN apk add git g++ make python

RUN npm install

# Needed when running in AWS on c5/m5/t3, see
# https://github.com/npm/npm/issues/20861
RUN npm config set unsafe-perm true

RUN npm install -g truffle@beta
