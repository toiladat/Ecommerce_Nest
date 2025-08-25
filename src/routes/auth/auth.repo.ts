import { PrismaService } from 'src/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { RegisterBodyType, VerificationCodeType } from './auth.model'
import { UserType } from 'src/shared/models/shared-user.model'

@Injectable()
export class AuthRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async createUser(
    user: Omit<RegisterBodyType, 'confirmPassword'> & Pick<UserType, 'roleId'>,
  ): Promise<Omit<UserType, 'password' | 'totpSecret'>> {
    return this.prismaService.user.create({
      data: user,
      omit: {
        password: true,
        totpSecret: true,
      },
    })
  }

  
  async createVerificationCode (payload: Pick<VerificationCodeType, 'expiresAt' |'email' |'code'|'type'>): Promise<VerificationCodeType>{
    return this.prismaService.verificationCode.upsert({
      where: { email: payload.email},
      create: payload,
      update: {
        code: payload.code,
        expiresAt: payload.expiresAt
      }
    })
  }
}
