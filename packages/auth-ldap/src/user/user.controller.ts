import { Controller, Logger, ParseIntPipe } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { UserService } from './user.service';
import { MSG_SEARCH } from './constants';

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @MessagePattern(MSG_SEARCH)
  async getUserById(
    @Payload() idUsuario: string,
    @Ctx() context: RmqContext
  ): Promise<any> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      return this.userService.getUserById(idUsuario);
    } finally {
      await channel.ack(originalMsg);
    }
  }
}
