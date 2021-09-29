import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const configService = new ConfigService();

@Module({
  imports: [
    PrismaModule,
    UserModule,
    JwtModule.register({
      secret: configService.get<string>('JWT_SECRET'),
      signOptions: { expiresIn: '30s' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}
