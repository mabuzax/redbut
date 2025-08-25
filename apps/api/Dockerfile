FROM node:20-alpine

WORKDIR /app

# Copy everything from root context
COPY . .

# Change to API directory where package.json exists
WORKDIR /app/apps/api

# List files to see what's copied
RUN ls -la

# Install dependencies
RUN npm install

# Install additional missing dependencies
RUN npm install date-fns @nestjs/axios axios

# Generate Prisma client
RUN npm run prisma:generate

EXPOSE 3001

# Create a startup script
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'npx prisma migrate deploy --schema ../../prisma/schema.prisma' >> /start.sh && \
    echo 'npm run dev' >> /start.sh && \
    chmod +x /start.sh

CMD ["/start.sh"]
