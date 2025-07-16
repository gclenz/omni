import { IsNotEmpty, IsNumber, IsUUID, Min } from 'class-validator';

export class TransferDto {
  @IsNotEmpty()
  @IsUUID('4')
  fromId: string;

  @IsNotEmpty()
  @IsUUID('4')
  toId: string;

  @IsNumber()
  @Min(1)
  amount: number;
}
