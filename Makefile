include .env

.PHONY: help build up down reset clean logs dev install check-env

# Default target - show help
.DEFAULT_GOAL := help

# Display available commands
help:
	@echo "Available commands:"
	@echo "  help     - Show this help message"
	@echo "  install  - Install dependencies"
	@echo "  build    - Build Docker images"
	@echo "  up       - Start services (detached)"
	@echo "  dev      - Start services in development mode"
	@echo "  down     - Stop services"
	@echo "  logs     - Show service logs"
	@echo "  clean    - Remove containers and volumes"
	@echo "  reset    - Full cleanup (containers, volumes, images)"

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