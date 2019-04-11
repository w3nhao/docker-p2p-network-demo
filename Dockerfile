#pull from the official image
FROM node:alpine

WORKDIR .
COPY . .

# Set proxy server, replace host:port with values for your servers
#ENV http_proxy http://127.0.0.1:8123/
#ENV https_proxy http://127.0.0.1:8123/

EXPOSE 4000
EXPOSE 30000

RUN npm install

CMD ["node", "."]