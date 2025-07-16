import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../shared/auth.guard';
import { TransferDto } from './dto/transfer.dto';
import { UserService } from './user.service';

@Controller('transfer')
export class TransferController {
  constructor(private readonly userService: UserService) { }

  @UseGuards(AuthGuard)
  @Post('/')
  @HttpCode(204)
  transfer(@Body() dto: TransferDto, @Req() req) {
    return this.userService.transfer({
      ...dto,
      fromId: req.user.sub as string,
    });
  }
}
