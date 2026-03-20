FROM node:18-bullseye-slim

RUN apt-get update && apt-get install -y wget apt-transport-https lua5.1 luajit && \
    wget https://packages.microsoft.com/config/debian/11/packages-microsoft-prod.deb -O /tmp/dotnet.deb && \
    dpkg -i /tmp/dotnet.deb && \
    apt-get update && \
    apt-get install -y dotnet-runtime-3.1 && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/dotnet.deb && \
    ln -sf /usr/bin/luac5.1 /usr/bin/luac

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY server.js .
COPY ironbrew/ ./ironbrew/

# IronBrew вызывает .\luajit.exe — создаём shell-обёртку с тем же именем
RUN printf '#!/bin/sh\nexec luajit "$@"\n' > /app/ironbrew/luajit.exe && \
    chmod +x /app/ironbrew/luajit.exe

EXPOSE 3000

CMD ["node", "server.js"]
