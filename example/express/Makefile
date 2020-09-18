all: build up test

build:
	rm -rf node_modules
	docker-compose build
up:
	docker-compose up --detach express-server
down:
	docker-compose down
logs:
	docker-compose logs express-server
test:
	sleep 1
	curl http://localhost:9999/profiles/admin
	curl http://localhost:9999/profiles/foo
