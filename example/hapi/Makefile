all:
	node main.js

build:
	rm -rf node_modules
	docker-compose build
up:
	docker-compose up --detach hapi-server
down:
	docker-compose down
logs:
	docker-compose logs hapi-server
test:
	sleep 1
	curl http://localhost:9999/hello/world
	curl http://localhost:9999/hello/foo-bar
