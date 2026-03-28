FROM node:18-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy the React source code
COPY . .

# Start the dev server
CMD ["npm", "start"]