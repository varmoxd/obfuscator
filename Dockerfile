# .NET Core 2.0 runtime (нужен для IronBrew2 CLI.dll)
FROM mcr.microsoft.com/dotnet/runtime:2.0 AS base

# Установить Node.js 18
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Скопировать зависимости и установить
COPY package.json .
RUN npm install --production

# Скопировать сервер и IronBrew
COPY server.js .
COPY ironbrew/ ./ironbrew/

EXPOSE 3000

CMD ["node", "server.js"]
