## Description

Techinical challenge for Omni Saúde App.

## Project setup

Before running the project, make sure that you have pnpm, Docker, and Docker Compose installed on your machine.

```bash
$ pnpm install

$ docker compose up -d

$ cp .env.sample .env

$ pnpm typeorm migration:run
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test
```

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Testcontainers](https://testcontainers.com)
