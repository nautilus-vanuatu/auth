import { Controller, Logger } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
  RpcException,
} from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { Credentials } from './interfaces/credentials.interface';
import { UserToken } from './interfaces/user-token.interface';
import { MSG_AUTHENTICATE, MSG_VALIDATE } from './constants';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @MessagePattern(MSG_AUTHENTICATE)
  async authenticate(
    @Payload() credentials: Credentials,
    @Ctx() context: RmqContext
  ): Promise<UserToken> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const user = await this.authService.authenticate(credentials);
      return user;
    } catch (err) {
      throw new RpcException(err);
    } finally {
      await channel.ack(originalMsg);
    }
  }

  @MessagePattern(MSG_VALIDATE)
  async validate(
    @Payload() token: string,
    @Ctx() context: RmqContext
  ): Promise<boolean> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const tokenValid = this.authService.validateToken(token);
      return tokenValid;
    } catch (err) {
      throw new RpcException(err);
    } finally {
      await channel.ack(originalMsg);
    }
  }
}
