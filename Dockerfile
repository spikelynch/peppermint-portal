FROM nginx:1.15

ENV APP_HOME /opt/peppermint-portal

RUN apt-get update; apt-get install wget git -y
RUN wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
RUN export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"; nvm install 8.11.0; nvm use 8.11.0; npm install -g @angular/cli yarn@1.5.1
RUN cd /opt; git clone https://github.com/redbox-mint/peppermint-portal.git
RUN export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"; nvm use 8.11.0; cd $APP_HOME; yarn install; ng build --prod --build-optimizer --output-path build/peppermint
RUN rm -rf /usr/share/nginx/html; ln -s $APP_HOME/build /usr/share/nginx/html
COPY support/nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
