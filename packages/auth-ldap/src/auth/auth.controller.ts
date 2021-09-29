import { Controller, Logger } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
  RpcException,
} from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { User } from '.prisma/client';
import { AuthService } from './auth.service';
import { Credentials } from './interfaces/credentials.interface';
import { UserLdap } from './interfaces/user-ldap.interface';
import { UserToken } from './interfaces/user-token.interface';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService
  ) {}

  @MessagePattern('authenticate')
  async authenticate(
    @Payload() credentials: Credentials,
    @Ctx() context: RmqContext
  ): Promise<UserToken> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const user: UserLdap = await this.authService.getLDAPUser(credentials);

      const userBd = await this.userService.getUserByUsername(user.uid);

      let updatedUser: User;

      if (userBd) {
        updatedUser = await this.userService.updateUser({
          where: { username: user.uid },
          data: {
            username: user.uid,
            email: user.mail,
            name: user.givenName,
            surname: user.sn,
          },
        });
      } else {
        updatedUser = await this.userService.createUser({
          username: user.uid,
          email: user.mail,
          name: user.givenName,
          surname: user.sn,
        });
      }

      const payload = {
        username: updatedUser.username,
        id: updatedUser.id,
      };

      return {
        user: updatedUser,
        access_token: this.jwtService.sign(payload),
      };
    } catch (err) {
      throw new RpcException('Error on authenticate user');
    } finally {
      await channel.ack(originalMsg);
    }
  }

  @MessagePattern('validate')
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
      throw new RpcException('Error on validating user');
    } finally {
      await channel.ack(originalMsg);
    }
  }
}
