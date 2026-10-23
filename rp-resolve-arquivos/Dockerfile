FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY src/ ./src/
COPY public/ ./public/
COPY data/ ./data/
EXPOSE 3847
ENV PORT=3847
CMD ["node", "src/server.js"]
