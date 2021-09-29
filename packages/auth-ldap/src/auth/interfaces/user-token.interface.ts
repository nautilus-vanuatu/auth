import { User } from '.prisma/client';

export interface UserToken {
  user: User;
  access_token: string;
}
