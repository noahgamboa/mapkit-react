FROM node:16
MAINTAINER Noah Gamboa

RUN apt-get update && \
    apt-get install --no-install-recommends -y \
    ca-certificates curl file \
    build-essential \
    autoconf automake autotools-dev libtool xutils-dev && \
    rm -rf /var/lib/apt/lists/*

# ENV SSL_VERSION=1.0.2k

# RUN curl https://www.openssl.org/source/openssl-$SSL_VERSION.tar.gz -O && \
#     tar -xzf openssl-$SSL_VERSION.tar.gz && \
#     cd openssl-$SSL_VERSION && ./config && make depend && make install && \
#     cd .. && rm -rf openssl-$SSL_VERSION*

# ENV OPENSSL_LIB_DIR=/usr/local/ssl/lib \
#     OPENSSL_INCLUDE_DIR=/usr/local/ssl/include \
#     OPENSSL_STATIC=1

# RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | bash -s -- -y

ENV PATH=/root/.cargo/bin:$PATH
ENV USER root
RUN npm install -g neon-cli
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

RUN cd isochrones && neon build

EXPOSE 5000

CMD ["node", "server.js"]
