import { RolesService } from './roles.service'
import { TokenService } from 'src/shared/services/token.service'
import { HashingService } from 'src/shared/services/hashing.service'
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from 'src/shared/helpers'
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly hashingService: HashingService,
    private readonly tokenService: TokenService,
    private readonly rolesService: RolesService,
  ) {}

  async register(body: any) {
    try {
      const clientRoleId = await this.rolesService.getClientRoleId()
      const hashPassword = await this.hashingService.hash(body.password)
      const user = await this.prismaService.user.create({
        data: {
          email: body.email,
          password: hashPassword,
          name: body.name,
          phoneNumber: body.phoneNumber,
          roleId: clientRoleId,
        },
        omit: {
          password: true,
          totpSecret: true,
        },
      })
      return user
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new ConflictException('Email alredy exist')
      }
      throw error
    }
  }

  async login(body: any) {
    const user = await this.prismaService.user.findUnique({
      where: {
        email: body.email,
      },
    })
    if (!user) {
      throw new UnauthorizedException('Account is not exist')
    }
    const isPasswordMatch = await this.hashingService.compare(body.password, user.password)
    if (!isPasswordMatch) {
      throw new UnauthorizedException([
        {
          field: 'password',
          error: 'Password is incorrect',
        },
      ])
    }
    const tokens = await this.generateTokens({ userId: user.id })
    return tokens
  }

  async generateTokens(payload: { userId: number }) {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken(payload),
      this.tokenService.signRefreshToken(payload),
    ])

    const decodeRefreshToken = await this.tokenService.verifyRefreshToken(refreshToken)
    await this.prismaService.refreshToken.create({
      data: {
        token: refreshToken,
        userId: payload.userId,
        expiresAt: new Date(decodeRefreshToken.exp * 1000),
      },
    })
    return { accessToken, refreshToken }
  }

  async refreshToken(refreshToken: string) {
    try {
      const { userId } = await this.tokenService.verifyRefreshToken(refreshToken)

      await this.prismaService.refreshToken.findUniqueOrThrow({
        where: { token: refreshToken },
      })

      await this.prismaService.refreshToken.delete({
        where: { token: refreshToken },
      })
      return this.generateTokens({ userId })
    } catch (error) {
      // Trường hợp đã refreshToken rồi
      if (isNotFoundPrismaError(error)) throw new UnauthorizedException('Refresh token has been revoked')
      throw new UnauthorizedException()
    }
  }

  async logout(refreshToken: string) {
    try {
      await this.tokenService.verifyRefreshToken(refreshToken)
      await this.prismaService.refreshToken.delete({
        where: { token: refreshToken },
      })
      return { message: 'Logout successfully' }
    } catch (error) {
      if (isNotFoundPrismaError(error)) throw new UnauthorizedException('Refresh token has been revoked')
      throw new UnauthorizedException()
    }
  }
}
