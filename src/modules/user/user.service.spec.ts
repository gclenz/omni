import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { CacheableMemory, Keyv } from 'cacheable';
import { Client } from 'pg';
import { User } from './entities/user.entity';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

  let postgresContainer: StartedPostgreSqlContainer;

  beforeAll(async () => {
    jest.setTimeout(30000);

    postgresContainer = await new PostgreSqlContainer('postgres:17').start();
    const postgresUrl = postgresContainer.getConnectionUri();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRootAsync({
          useFactory: () => ({
            type: 'postgres',
            url: postgresUrl,
            entities: [User],
            migrationsRun: true,
            migrations: ['./**/migration/**/*.ts'],
          }),
        }),
        TypeOrmModule.forFeature([User]),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            global: true,
            secret: configService.get('JWT_SECRET'),
            signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN') },
          }),
          global: true,
        }),
        ConfigModule.forRoot({ isGlobal: true }),
        CacheModule.register({
          useFactory: () => {
            return {
              stores: [
                new Keyv({
                  store: new CacheableMemory({ ttl: '1s', lruSize: 5000 }),
                }),
              ],
            };
          },
        }),
      ],
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterAll(async () => {
    await postgresContainer.stop();
  });

  beforeEach(async () => {
    const client = new Client({
      connectionString: postgresContainer.getConnectionUri(),
    });
    await client.connect();
    await client.query('DELETE FROM users');
    await client.end();
  });

  it('should create a user without error', async () => {
    const user = {
      username: 'testuser',
      password: '12345678',
      birthdate: '1998-10-10',
    };

    const { id } = await service.create(user);
    expect(id).toBeDefined();
  });

  it('should not create a user with the same username', async () => {
    const user = {
      username: 'testuserduplicated',
      password: '12345678',
      birthdate: '1998-10-10',
    };

    await service.create(user);
    await expect(service.create(user)).rejects.toThrow();
  });

  it('should successfully transfer money between two users', async () => {
    const userA = {
      username: 'userA',
      password: '12345678',
      birthdate: '1998-10-10',
    };
    const userB = {
      username: 'userB',
      password: '12345678',
      birthdate: '1998-10-10',
    };

    const { id: idA } = await service.create(userA);
    const { id: idB } = await service.create(userB);
    await expect(
      service.transfer({
        fromId: idA,
        toId: idB,
        amount: 100,
      }),
    ).resolves.not.toThrow();
  });

  it('should not allow transfers that will leave the user`s balance negative', async () => {
    const userA = {
      username: 'userA',
      password: '12345678',
      birthdate: '1998-10-10',
    };
    const userB = {
      username: 'userB',
      password: '12345678',
      birthdate: '1998-10-10',
    };

    const { id: idA } = await service.create(userA);
    const { id: idB } = await service.create(userB);
    await expect(
      service.transfer({
        fromId: idA,
        toId: idB,
        amount: 1001,
      }),
    ).rejects.toThrow();
  });

  it('should not allow transfers for yourself', async () => {
    const userA = {
      username: 'userA',
      password: '12345678',
      birthdate: '1998-10-10',
    };

    const { id: idA } = await service.create(userA);
    await expect(
      service.transfer({
        fromId: idA,
        toId: idA,
        amount: 1000,
      }),
    ).rejects.toThrow();
  });

  it('should not allow transfers with less than one minute apart', async () => {
    const userA = {
      username: 'userA',
      password: '12345678',
      birthdate: '1998-10-10',
    };
    const userB = {
      username: 'userB',
      password: '12345678',
      birthdate: '1998-10-10',
    };

    const { id: idA } = await service.create(userA);
    const { id: idB } = await service.create(userB);
    await service.transfer({
      fromId: idA,
      toId: idB,
      amount: 100,
    });
    await expect(
      service.transfer({
        fromId: idA,
        toId: idB,
        amount: 100,
      }),
    ).rejects.toThrow();
  });

  it('should not allow transfers for not found user', async () => {
    const userA = {
      username: 'userA',
      password: '12345678',
      birthdate: '1998-10-10',
    };

    const { id: idA } = await service.create(userA);
    await expect(
      service.transfer({
        fromId: idA,
        toId: 'unknown',
        amount: 1000,
      }),
    ).rejects.toThrow();
  });

  it('should list users without error', async () => {
    const user = {
      username: 'testuser',
      password: '12345678',
      birthdate: '1998-10-10',
    };

    await service.create(user);
    const { users } = await service.findAll();
    expect(users.length).toBe(1);
  });

  it('should return a token for correct password', async () => {
    const user = {
      username: 'testuser',
      password: '12345678',
      birthdate: '1998-10-10',
    };

    await service.create(user);
    const { token } = await service.authenticate(user);
    expect(token).toBeDefined();
  });
});
