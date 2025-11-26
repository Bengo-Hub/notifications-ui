#!/bin/sh

echo "Starting database migration and seeding..."

# Check if database URL is provided
if [ -n "$NOTIFICATIONS_POSTGRES_URL" ]; then
    echo "Checking database connectivity..."
    
    # Extract host and port from database URL for basic connectivity check
    if command -v pg_isready >/dev/null 2>&1; then
        # Extract host and port from URL
        DB_HOST=$(echo "$NOTIFICATIONS_POSTGRES_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
        DB_PORT=$(echo "$NOTIFICATIONS_POSTGRES_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        
        # Default values if extraction failed
        DB_HOST=${DB_HOST:-localhost}
        DB_PORT=${DB_PORT:-5432}
        
        # Map localhost for Docker containers
        if [ "$DB_HOST" = "localhost" ] || [ "$DB_HOST" = "127.0.0.1" ]; then
            DB_HOST="host.docker.internal"
        fi
        
        echo "Waiting for database at $DB_HOST:$DB_PORT..."
        timeout 30s sh -c "until pg_isready -h '$DB_HOST' -p '$DB_PORT'; do sleep 1; done" 2>/dev/null || {
            echo "Database may not be ready - continuing anyway"
        }
    fi
fi

echo "Running database migrations..."
/app/migrate
if [ $? -ne 0 ]; then
    echo "ERROR: Migration failed"
    exit 1
fi
echo "Migrations completed successfully"

echo "Running database seed..."
/app/seed
if [ $? -ne 0 ]; then
    echo "WARNING: Seeding failed (may be already seeded)"
fi
echo "Seeding completed"

# Start background worker if enabled
if [ "$NOTIFICATIONS_ENABLE_WORKER" = "true" ]; then
    echo "Starting background worker..."
    /app/worker &
fi

echo "Starting notifications service..."
exec /app/service "$@"
