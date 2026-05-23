# ─── Endetted Makefile ──────────────────────────────────────────────────────
# Wraps npm workspace scripts so common tasks have a single, memorable target.
# Mirrors the same "declare targets, list dependencies, run recipes" pattern
# taught in lecture for C/C++ projects.
# ────────────────────────────────────────────────────────────────────────────

.PHONY: all install dev frontend backend test clean

# Default target: install all dependencies
all: install

# Install dependencies for every workspace
install:
	npm install

# Run the full dev stack (frontend + backend concurrently)
dev: install
	npm run dev

# Run only the frontend dev server
frontend: install
	npm run dev --prefix frontend

# Run only the backend dev server
backend: install
	npm run dev --prefix backend

# Run all test suites
test:
	npm test --prefix frontend -- --watchAll=false
	npm test --prefix backend

# Remove generated / installed artefacts (mirrors `make clean` for C builds)
clean:
	rm -rf node_modules frontend/node_modules backend/node_modules
	rm -rf frontend/dist
