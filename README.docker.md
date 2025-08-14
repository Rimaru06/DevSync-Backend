# DevSync Server Docker Setup

## Environment Variables

Copy `.env.example` to `.env` and modify as needed:

```bash
cp .env.example .env
```

## Quick Start

### Development Environment

```bash
# Start all services including database
make dev

# Or manually:
docker compose up --build
```

### Database Only

```bash
# Start only PostgreSQL
docker compose up db
```

## Available Services

1. **PostgreSQL Database** (`db`)

   - Port: 5432 (configurable via POSTGRES_PORT)
   - Database: devsync
   - User: postgres
   - Health checks included

2. **Node.js Application** (`app`)

   - Port: 3000 (configurable via APP_PORT)
   - Hot reload enabled
   - Depends on database health

3. **pgAdmin** (`pgadmin`)
   - Port: 5050 (configurable via PGADMIN_PORT)
   - Database management UI for table visualization
   - Access: http://localhost:5050
   - Login: admin@devsync.com / admin (configurable in .env)

## Make Commands

```bash
make help     # Show available commands
make install  # Install dependencies
make build    # Build Docker images
make up       # Start services (detached)
make dev      # Start development environment
make down     # Stop services
make logs     # Show logs
make clean    # Remove containers and volumes
make reset    # Full cleanup
```

## Health Checks

- Database: `pg_isready` - ensures PostgreSQL is ready
- App: Waits for database to be healthy before starting

## Volumes

- `postgres_data`: Database persistence
- Source code: Mounted for hot reload (changes reflect immediately)

## Usage

```bash
# Copy environment template
cp .env.example .env

# Start development environment
make dev

# Access your services:
# - App: http://localhost:3000
# - Database: localhost:5432
# - pgAdmin: http://localhost:5050
```

## pgAdmin Setup

1. Access pgAdmin at http://localhost:5050
2. Login with credentials from .env file (default: admin@devsync.com / admin)
3. Add a new server connection:
   - **Host**: `db` (Docker service name)
   - **Port**: `5432`
   - **Database**: `devsync`
   - **Username**: `postgres`
   - **Password**: `mysecretpassword` (or your .env value)

Now you can visually browse your database tables and data! 🎉

- For caching/sessions

4. **pgAdmin** (`pgadmin`) - Optional
   - Port: 5050 (configurable via PGADMIN_PORT)
   - Database management UI
   - Access: http://localhost:5050
   - Use profile: `--profile tools`

## Make Commands

```bash
make help     # Show available commands
make install  # Install dependencies
make build    # Build Docker images
make up       # Start services (detached)
make dev      # Start development environment
make down     # Stop services
make logs     # Show logs
make clean    # Remove containers and volumes
make reset    # Full cleanup
```

## Docker Compose Profiles

- **Default**: `db`, `app`, `redis`
- **Tools**: Add `pgadmin` with `--profile tools`

```bash
# Start with database management tools
docker compose --profile tools up
```

## Health Checks

All services include health checks:

- Database: `pg_isready`
- Redis: `redis-cli ping`
- App: Waits for database to be healthy

## Volumes

- `postgres_data`: Database persistence
- `redis_data`: Redis persistence
- `pgadmin_data`: pgAdmin settings
- Source code: Mounted for hot reload

## Production Deployment

For production, use the production Dockerfile:

```bash
# Build production image
docker build -f Dockerfile.dev --target production -t devsync:prod .

# Or create docker-compose.prod.yml for production
```
