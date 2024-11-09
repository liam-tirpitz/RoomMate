FROM node:22
RUN apt-get update || : && apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev unzip
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

RUN curl -L -O https://github.com/bitwarden/sdk/releases/download/bws-v1.0.0/bws-x86_64-unknown-linux-gnu-1.0.0.zip && unzip bws-x86_64-unknown-linux-gnu-1.0.0.zip && chmod +x bws && export PATH=/home/node/app:$PATH
USER root
RUN cp bws /bin/bws
USER node

USER node
WORKDIR /home/node/app

COPY  --chown=node:node ["package.json", "package-lock.json*", "run.sh", "./"]

RUN ls .
RUN npm install --force
COPY --chown=node:node . .
COPY --chown=node:node deployment_example/config ./config
RUN npm run build
RUN ["chmod", "+x", "./run.sh"]
EXPOSE 3001
CMD [ "npm", "run", "autostart" ]