import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prismaService.user.create({ data });
  }

  async updateUser(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }): Promise<User> {
    const { data, where } = params;

    return this.prismaService.user.update({ data, where });
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const user = await this.prismaService.user.findUnique({
      where: { username },
    });

    return user;
  }

  async getUserById(userId: string): Promise<User | null> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    return user;
  }
}
