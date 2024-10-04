FROM node:22
RUN apt-get update || : && apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
USER node
WORKDIR /home/node/app
COPY  --chown=node:node ["package.json", "package-lock.json*", "./"]
RUN ls .
RUN npm install
COPY --chown=node:node . .
RUN npm run build

EXPOSE 3001
CMD [ "npm", "run", "start" ]