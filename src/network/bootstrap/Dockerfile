FROM node:22

COPY . /opt/bootstrap-node

WORKDIR /opt/bootstrap-node

RUN npm ci

ENTRYPOINT [ "npm", "run", "start"]
