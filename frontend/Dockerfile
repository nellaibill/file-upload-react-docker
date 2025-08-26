FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 19006
# Show a hint when the container starts
ENV HOST=0.0.0.0
ENV EXPO_WEB_PORT=19006
CMD echo "==============================" && \
	echo " Expo Web UI running in Docker" && \
	echo " Open http://localhost:19006 " && \
	echo "==============================" && \
	npm run web