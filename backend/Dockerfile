FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install application dependencies
# Using npm install instead of ci in case there's no package-lock.json
RUN npm install

# Copy the rest of the backend source code
COPY . .

# Expose the port the app runs on (from index.js, it uses 3001)
EXPOSE 3001

# Command to run the application securely without nodemon overhead
CMD ["node", "index.js"]
