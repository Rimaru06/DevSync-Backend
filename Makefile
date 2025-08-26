include .env

.PHONY: help build up down reset clean logs dev install check-env

# Default target - show help
.DEFAULT_GOAL := help

# Display available commands
help:
	@echo "🚀 DevSync Development Commands:"
	@echo ""
	@echo "  help       - Show this help message"
	@echo "  dev        - Start development with hot reload"
	@echo "  dev-logs   - Start development and show logs"
	@echo "  logs       - Show all service logs"
	@echo "  logs-app   - Show only app logs"
	@echo "  logs-db    - Show only database logs"
	@echo "  shell      - Access app container shell"
	@echo "  build      - Build Docker images"
	@echo "  up         - Start services (detached)"
	@echo "  down       - Stop services"
	@echo "  clean      - Remove containers and volumes"
	@echo "  reset      - Full cleanup and rebuild"
	@echo "  install    - Install dependencies"
	@echo ""

# Development with hot reload
dev:
	@echo "🚀 Starting DevSync with hot reload..."
	@echo "📝 Edit files in VS Code and see changes instantly!"
	docker compose up --build

# Development with logs visible
dev-logs:
	@echo "🚀 Starting DevSync with hot reload and logs..."
	docker compose up --build

# Show logs from specific services
logs-app:
	@echo "📱 Showing application logs..."
	docker compose logs -f app

logs-db:
	@echo "🗄️ Showing database logs..."
	docker compose logs -f db

# Access container shell
shell:
	@echo "🐚 Accessing application container..."
	docker compose exec app sh

# Install dependencies
install:
	@echo "Installing dependencies..."
	pnpm install

# Build Docker images
build:
	@echo "Building Docker images..."
	sudo docker compose build

# Start services in detached mode
up:
	@echo "Starting services..."
	sudo docker compose up -d

# Start services in development mode (with logs)
dev:
	@echo "Starting development environment..."
	sudo docker compose up --build

# Stop services
down:
	@echo "Stopping services..."
	sudo docker compose down

# Show logs
logs:
	sudo docker compose logs -f

# Remove containers and volumes
clean:
	@echo "Cleaning up containers and volumes..."
	sudo docker compose down -v

# Full cleanup - remove everything
reset:
	@echo "Performing full reset..."
	sudo docker compose down -v --rmi all
	sudo docker system prune -f