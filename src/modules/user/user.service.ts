import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { hashSync, verifySync } from '@node-rs/argon2';
import { randomUUID } from 'crypto';
import { EntityManager, Repository } from 'typeorm';
import { AuthenticateUserDto } from './dto/authenticate-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { TransferDto } from './dto/transfer.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private entityManager: EntityManager,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  async create(dto: CreateUserDto): Promise<{ id: string }> {
    const user = await this.findByUsername({ username: dto.username });
    if (user) throw new BadRequestException('Nome de usuário em uso');

    const userId = randomUUID();
    const passwordSalt = randomUUID();
    const passwordHash = hashSync(`${passwordSalt}${dto.password}`);

    await this.userRepository.insert({
      id: userId,
      username: dto.username,
      password: passwordHash,
      birthdate: dto.birthdate,
      salt: passwordSalt,
      balance: 1000,
    });

    return { id: userId };
  }

  async findAll(): Promise<{ users: Partial<User>[] }> {
    const users = await this.userRepository.find({
      select: ['id', 'username', 'birthdate', 'balance'],
    });
    return { users };
  }

  async authenticate({
    username,
    password,
  }: AuthenticateUserDto): Promise<{ token: string; expiresIn: string }> {
    const error = new UnauthorizedException(
      'Usuário não encontrado ou senha incorreta.',
    );
    const user: User = await this.findByUsername({ username });
    if (!user) throw error;

    const doesPasswordMatch = verifySync(
      user.password,
      `${user.salt}${password}`,
    );
    if (!doesPasswordMatch) throw error;

    const token = await this.jwtService.signAsync(
      { sub: user.id, username: user.username },
      { expiresIn: this.configService.get('JWT_EXPIRES_IN') },
    );

    return {
      token,
      expiresIn: this.configService.get('JWT_EXPIRES_IN'),
    };
  }

  async transfer(dto: TransferDto): Promise<void> {
    if (dto.fromId === dto.toId)
      throw new BadRequestException(
        'Você não pode realizar uma transferência para si mesmo',
      );

    const sender = await this.findById({ id: dto.fromId });
    if (!sender)
      throw new NotFoundException(
        'O usuário a realizar a transferência não foi encontrado',
      );

    const receiver = await this.findById({ id: dto.toId });
    if (!receiver)
      throw new NotFoundException(
        'O usuário a receber a transferência não foi encontrado',
      );

    const newSenderBalance = Number(sender.balance) - dto.amount;
    const newReceiverBalance = Number(receiver.balance) + dto.amount;

    const canTransfer = newSenderBalance >= 0;
    if (!canTransfer)
      throw new BadRequestException(
        'Você não possui saldo suficiente para realizar a transação',
      );

    await this.entityManager.transaction(async (transactionalEntityManager) => {
      await transactionalEntityManager.save(
        Object.assign(sender, { balance: newSenderBalance } as Partial<User>),
      );
      await transactionalEntityManager.save(
        Object.assign(receiver, {
          balance: newReceiverBalance,
        } as Partial<User>),
      );
    });
  }

  private async findByUsername({
    username,
  }: {
    username: string;
  }): Promise<User | undefined> {
    return await this.userRepository.findOneBy({ username });
  }

  private async findById({ id }: { id: string }): Promise<User | undefined> {
    return await this.userRepository.findOneBy({ id });
  }
}
