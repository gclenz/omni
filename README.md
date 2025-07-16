## Description

Desafio técnico para a Omni Saúde App.

## Project setup

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

# test coverage
$ pnpm run test:cov
```

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
