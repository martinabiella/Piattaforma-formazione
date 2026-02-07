#!/bin/bash

# Configuration
DB_NAME="piattaforma_formazione"
DB_USER=$(whoami) # Use current system user for Homebrew Postgres

echo "🚀 Setting up local development environment..."

# Check for required tools
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed or not in PATH."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed or not in PATH."
    exit 1
fi

# Create .env file if it doesn't exist (or overwrite if it's broken/wrong)
# We'll just overwrite it to be safe since the previous one was likely wrong
echo "📝 Creating/Updating .env file..."
cat <<EOT > .env
DATABASE_URL=postgresql://$DB_USER@localhost:5432/$DB_NAME
SESSION_SECRET=local_dev_secret_key_$(openssl rand -hex 16)
PGUSER=$DB_USER
PGHOST=localhost
PGPORT=5432
PGDATABASE=$DB_NAME
PORT=5001
EOT
echo "✅ .env updated with user '$DB_USER'."

# Create Database
echo "🗄️ Creating database '$DB_NAME'..."
if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "ℹ️ Database '$DB_NAME' already exists."
else
    createdb "$DB_NAME"
    if [ $? -eq 0 ]; then
        echo "✅ Database created successfully."
    else
        echo "❌ Failed to create database. Please ensure PostgreSQL is running."
        exit 1
    fi
fi

# Install Dependencies
echo "📦 Installing dependencies..."
npm install

# Push Schema
echo "🔄 Pushing database schema..."
npm run db:push

# Seed Database
echo "🌱 Seeding database..."
npm run seed

echo "🎉 Setup complete! You can now run 'npm run dev' to start the application."
