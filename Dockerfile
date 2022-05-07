FROM node
WORKDIR /srv
COPY dao/ dao/
RUN MKDIR /log
COPY package.json connectionDb.js model.js transportRealtime.js ./
RUN npm install
CMD ["node", "transportRealtime.js"]
