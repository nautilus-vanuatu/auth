import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import * as LdapClient from 'ldapjs-client';

import { User } from '.prisma/client';
import { UserService } from '../user/user.service';
import { Credentials } from './interfaces/credentials.interface';
import { UserLdap } from './interfaces/user-ldap.interface';
import { ERR_AUTHENTICATE, ERR_VALIDATE } from './constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService
  ) {}

  private readonly logger = new Logger(AuthService.name);

  private readonly configService = new ConfigService();

  async authenticate(credentials: Credentials): Promise<any> {
    try {
      const user: UserLdap = await this.getLDAPUser(credentials);

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
      throw new RpcException(ERR_AUTHENTICATE);
    }
  }

  private async getLDAPUser(credentials: Credentials): Promise<any> {
    this.logger.log(`credentials: ${JSON.stringify(credentials)}`);

    const { username, password } = credentials;

    const client = new LdapClient({
      url: this.configService.get<string>('LDAP_SERVER') || '',
    });

    await this.bindUser(client, username, password);

    const ldapUser: UserLdap = await this.searchUser(client, username);

    return ldapUser;
  }

  validateToken(token: string): boolean {
    this.logger.log(token);
    try {
      this.jwtService.verify(token);
      return true;
    } catch (err) {
      this.logger.error(`Token validation error: ${err}`);
      throw new RpcException(ERR_VALIDATE);
    }
  }

  private async bindUser(
    client: LdapClient,
    username: string,
    password: string
  ): Promise<void> {
    const base = this.configService.get<string>('LDAP_SEARCH_BASE');

    try {
      await client.bind(`uid=${username},${base}`, password);
    } catch (err) {
      this.logger.error(err);
      throw new RpcException('Invalid Credentials');
    }
  }

  private async searchUser(
    client: LdapClient,
    username: string
  ): Promise<UserLdap> {
    const base = this.configService.get<string>('LDAP_SEARCH_BASE') || '';
    const baseBind = this.configService.get<string>('LDAP_BIND_BASE');
    const searchUser = this.configService.get<string>('LDAP_SEARCH_USER');
    const searchPass = this.configService.get<string>('LDAP_SEARCH_PASS') || '';
    const bindPrefix = this.configService.get<string>('LDAP_BIND_PREFIX');

    try {
      await client.bind(
        `${bindPrefix ? `${bindPrefix}=` : ''}${searchUser},${baseBind}`,
        searchPass
      );

      const entry: any = await client.search(base, {
        scope: 'sub',
        filter: `(uid=${username})`,
      });

      this.logger.log(JSON.stringify(entry));

      return {
        uid: entry[0].uid,
        employeeNumber: entry[0].employeeNumber,
        departmentNumber: entry[0].departmentNumber,
        displayName: entry[0].displayName,
        sn: entry[0].sn,
        cn: entry[0].cn,
        mail: entry[0].mail,
        givenName: entry[0].givenName,
      };
    } catch (err) {
      this.logger.error(err);
      throw new RpcException('Error searching user');
    }
  }
}
