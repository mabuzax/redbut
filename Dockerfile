# Use the official PostgreSQL image from Docker Hub
FROM postgres:15

# Set environment variables for Postgres
ENV POSTGRES_USER=postgres \
    POSTGRES_PASSWORD=postgres \
    POSTGRES_DB=redbut \
    TZ=Africa/Johannesburg \
    PGTZ=Africa/Johannesburg

# Copy schema and migration files
COPY prisma/schema.prisma /docker-entrypoint-initdb.d/
COPY prisma/migrations /docker-entrypoint-initdb.d/migrations/

# Copy timezone configuration
RUN echo "timezone = 'Africa/Johannesburg'" >> /usr/share/postgresql/postgresql.conf.sample

# Expose the PostgreSQL port
EXPOSE 5432


