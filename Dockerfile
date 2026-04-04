FROM node:24-alpine

# Set default path for ignore-users storage in container
ENV IGNORE_USERS_PATH=/data/ignore-users.json
ENV IGNORE_USERS_DIR=/data

WORKDIR /app
COPY . .
RUN yarn install

# Persist ignore list outside of container filesystem
VOLUME ["/data"]

CMD yarn start
