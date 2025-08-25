import { SharedUserRepository } from './../../shared/repositories/shared-user.repo'
import { AuthRepository } from './auth.repo'
import { RolesService } from './roles.service'
import { HashingService } from 'src/shared/services/hashing.service'
import { ConflictException, Injectable, UnprocessableEntityException } from '@nestjs/common'
import { generateOTP, isUniqueConstraintPrismaError } from 'src/shared/helpers'
import { RegisterBodyType, SendOTPBodyType } from './auth.model'
import { addMilliseconds } from 'date-fns'
import envConfig from 'src/shared/config'
import ms, { StringValue } from 'ms'

@Injectable()
export class AuthService {
  constructor(
    private readonly hashingService: HashingService,
    private readonly rolesService: RolesService,
    private readonly authRepository: AuthRepository,
    private readonly sharedUserRepository: SharedUserRepository,
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

  async sendTOP(body: SendOTPBodyType) {
    //Kiểm tra user tồn tại
    const user = await this.sharedUserRepository.findUnique({ email: body.email })
    if (user)
      throw new UnprocessableEntityException([
        {
          path: 'email',
          message: 'Email already exist',
        },
      ])
    const code = generateOTP()
    const verificationCode = await this.authRepository.createVerificationCode({
      email: body.email,
      code,
      type: body.type,
      expiresAt: addMilliseconds(new Date(), ms(envConfig.OTP_EXPIRES_IN as StringValue) as number),
    })
    // gui email

    return verificationCode
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
