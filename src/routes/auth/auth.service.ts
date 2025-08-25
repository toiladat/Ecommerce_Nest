import { AuthRepository } from './auth.repo'
import { RolesService } from './roles.service'
import { HashingService } from 'src/shared/services/hashing.service'
import { ConflictException, Injectable } from '@nestjs/common'
import { isUniqueConstraintPrismaError } from 'src/shared/helpers'
import { RegisterBodyType, SendOTPBodyType } from './auth.model'

@Injectable()
export class AuthService {
  constructor(
    private readonly hashingService: HashingService,
    private readonly rolesService: RolesService,
    private readonly authRepository: AuthRepository,
  ) {}

  async register(body: RegisterBodyType) {
    try {
      const clientRoleId = await this.rolesService.getClientRoleId()
      const hashPassword = await this.hashingService.hash(body.password)
      return await this.authRepository.createUser({
        email: body.email,
        name: body.name,
        phoneNumber: body.phoneNumber,
        roleId: clientRoleId,
        password: hashPassword,
      })
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new ConflictException('Email alredy exist')
      }
      throw error
    }
  }

  sendTOP(body: SendOTPBodyType) {
    return body
  }
  // async login(body: any) {
  //   const user = await this.prismaService.user.findUnique({
  //     where: {
  //       email: body.email,
  //     },
  //   })
  //   if (!user) {
  //     throw new UnauthorizedException('Account is not exist')
  //   }
  //   const isPasswordMatch = await this.hashingService.compare(body.password, user.password)
  //   if (!isPasswordMatch) {
  //     throw new UnauthorizedException([
  //       {
  //         field: 'password',
  //         error: 'Password is incorrect',
  //       },
  //     ])
  //   }
  //   const tokens = await this.generateTokens({ userId: user.id })
  //   return tokens
  // }

  // async generateTokens(payload: { userId: number }) {
  //   const [accessToken, refreshToken] = await Promise.all([
  //     this.tokenService.signAccessToken(payload),
  //     this.tokenService.signRefreshToken(payload),
  //   ])

  //   const decodeRefreshToken = await this.tokenService.verifyRefreshToken(refreshToken)
  //   await this.prismaService.refreshToken.create({
  //     data: {
  //       token: refreshToken,
  //       userId: payload.userId,
  //       expiresAt: new Date(decodeRefreshToken.exp * 1000),
  //     },
  //   })
  //   return { accessToken, refreshToken }
  // }

  // async refreshToken(refreshToken: string) {
  //   try {
  //     const { userId } = await this.tokenService.verifyRefreshToken(refreshToken)

  //     await this.prismaService.refreshToken.findUniqueOrThrow({
  //       where: { token: refreshToken },
  //     })

  //     await this.prismaService.refreshToken.delete({
  //       where: { token: refreshToken },
  //     })
  //     return this.generateTokens({ userId })
  //   } catch (error) {
  //     // Trường hợp đã refreshToken rồi
  //     if (isNotFoundPrismaError(error)) throw new UnauthorizedException('Refresh token has been revoked')
  //     throw new UnauthorizedException()
  //   }
  // }

  // async logout(refreshToken: string) {
  //   try {
  //     await this.tokenService.verifyRefreshToken(refreshToken)
  //     await this.prismaService.refreshToken.delete({
  //       where: { token: refreshToken },
  //     })
  //     return { message: 'Logout successfully' }
  //   } catch (error) {
  //     if (isNotFoundPrismaError(error)) throw new UnauthorizedException('Refresh token has been revoked')
  //     throw new UnauthorizedException()
  //   }
  // }
}
