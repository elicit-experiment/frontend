FROM node

ARG API_URL
ARG ELICIT_LANDING_URL
ARG API_SCHEME

RUN apt-get update
RUN apt-get install -y ruby-dev build-essential
#RUN gem install compass --pre

RUN npm uninstall gulp -g
RUN npm install -g gulp
RUN npm install gulpjs/gulp-cli -g
RUN npm install gulp-coffee
RUN npm install gulp-concat
RUN npm install gulp-uglify
RUN npm install gulp-compass

# Enable installing gems from git repos
RUN apt-get install git

# to handle running as a normal user
#RUN dnf -y install sudo

#RUN adduser --disabled-password elicituser
# && \
#    echo "elicituser ALL=(root) NOPASSWD:ALL" >> /etc/sudoers

RUN mkdir /experiment-frontend

WORKDIR /experiment-frontend

COPY ./package.json /experiment-frontend
COPY ./package-lock.json /experiment-frontend
COPY ./yarn.lock /experiment-frontend

RUN npm install

COPY . /experiment-frontend

RUN sed -i'' -E "s/(\s+portalPath\: ).*/\1\"$API_SCHEME:\/\/$API_URL\",/g" gulpfile.js 
RUN sed -i'' -E "s/(\s+elicitLandingPath\: ).*/\1\"$API_SCHEME:\/\/$ELICIT_LANDING_URL\",/g" gulpfile.js 

RUN cat gulpfile.js | grep portalPath

RUN npm --version

RUN node --version

RUN gulp  --version
#RUN chown -R elicituser:elicituser /experiment-frontend

#USER elicituser

RUN gulp build

CMD ["/bin/bash", "./run.sh"]
