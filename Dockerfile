FROM node
WORKDIR /srv
COPY dao connectionDb.js model.js transportRealtime.js ./
COPY package.json .
RUN npm install
CMD ["node", ".\transportRealtime.js"]
