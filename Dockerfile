FROM node:22-alpine

ARG API_URL
ARG ELICIT_LANDING_URL
ARG API_SCHEME

RUN apk add git
RUN apk add --no-cache rust cargo

RUN mkdir /experiment-frontend

WORKDIR /experiment-frontend

ENV API_SCHEME=$API_SCHEME
ENV API_URL=$API_URL
ENV ELICIT_LANDING_URL=$ELICIT_LANDING_URL
COPY make_config.sh .
RUN chmod +x make_config.sh
RUN mkdir -p ./source
RUN ./make_config.sh
RUN cat ./source/configuration-production.json

COPY ./package.json /experiment-frontend/
COPY ./package-lock.json /experiment-frontend/

RUN ls -als

RUN npm install

COPY . /experiment-frontend
RUN cd wasm/face-landmark && cargo build
RUN mv ./source/configuration-production.json ./source/configuration.json
RUN cat ./source/configuration.json

RUN npm --version

RUN node --version

RUN mkdir dist

RUN npm run build

CMD ["/bin/sh", "./run.sh"]
