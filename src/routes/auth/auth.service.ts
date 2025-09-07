import { EmailService } from 'src/shared/services/email.service'
import { SharedUserRepository } from 'src/shared/repositories/shared-user.repo'
import { AuthRepository } from './auth.repo'
import { RolesService } from './roles.service'
import { HashingService } from 'src/shared/services/hashing.service'
import {
  ConflictException,
  HttpException,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { generateOTP, isNotFoundPrismaError, isUniqueConstraintPrismaError } from 'src/shared/helpers'
import { LoginBodyType, RefreshTokenBodyType, RegisterBodyType, SendOTPBodyType } from './auth.model'
import { addMilliseconds } from 'date-fns'
import envConfig from 'src/shared/config'
import ms, { StringValue } from 'ms'
import { TypeOfVerificationCode } from 'src/shared/constants/auth.constant'
import { TokenService } from 'src/shared/services/token.service'
import { AccessTokenPayloadCreate } from 'src/shared/types/jwt.type'

@Injectable()
export class AuthService {
  constructor(
    private readonly hashingService: HashingService,
    private readonly rolesService: RolesService,
    private readonly authRepository: AuthRepository,
    private readonly sharedUserRepository: SharedUserRepository,
    private readonly emailService: EmailService,
    private readonly tokenService: TokenService,
  ) {}

  async register(body: RegisterBodyType) {
    try {
      const verificationCode = await this.authRepository.findUniqueVerificationCode({
        email: body.email,
        code: body.code,
        type: TypeOfVerificationCode.REGISTER,
      })
      if (!verificationCode) {
        throw new UnprocessableEntityException([
          {
            message: 'OTP not valid',
            path: 'code',
          },
        ])
      }
      if (verificationCode.expiresAt < new Date()) {
        throw new UnprocessableEntityException([
          {
            message: 'OTP expired',
            path: 'code',
          },
        ])
      }
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
    await this.authRepository.createVerificationCode({
      email: body.email,
      code,
      type: body.type,
      expiresAt: addMilliseconds(new Date(), ms(envConfig.OTP_EXPIRES_IN as StringValue) as number),
    })
    // gui email
    const { error } = await this.emailService.sendOTP({
      email: body.email,
      code,
    })
    if (error) {
      throw new UnprocessableEntityException([
        {
          message: 'Send OTP failure',
          path: 'code',
        },
      ])
    }
    return { message: 'Send OTP Successfully' }
  }

  async login(body: LoginBodyType & { userAgent: string; ip: string }) {
    const user = await this.authRepository.findUniqueUserIncludeRole({
      email: body.email,
    })
    if (!user) {
      throw new UnprocessableEntityException([
        {
          path: 'email',
          message: 'Email is not exist',
        },
      ])
    }
    const isPasswordMatch = await this.hashingService.compare(body.password, user.password)
    if (!isPasswordMatch) {
      throw new UnprocessableEntityException([
        {
          field: 'password',
          error: 'Password is incorrect',
        },
      ])
    }
    const device = await this.authRepository.createDevice({
      userId: user.id,
      ip: body.ip,
      userAgent: body.userAgent,
    })
    const tokens = await this.generateTokens({
      userId: user.id,
      deviceId: device.id,
      roleId: user.roleId,
      roleName: user.role.name,
    })
    return tokens
  }

  async generateTokens({ userId, deviceId, roleId, roleName }: AccessTokenPayloadCreate) {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken({ userId, deviceId, roleId, roleName }),
      this.tokenService.signRefreshToken({ userId }),
    ])

    const decodeRefreshToken = await this.tokenService.verifyRefreshToken(refreshToken)
    await this.authRepository.createRefreshToken({
      token: refreshToken,
      userId,
      expiresAt: new Date(decodeRefreshToken.exp * 1000),
      deviceId,
    })
    return { accessToken, refreshToken }
  }

  async refreshToken({ refreshToken, userAgent, ip }: RefreshTokenBodyType & { userAgent: string; ip: string }) {
    try {
      //Kiểm tra token hợp lệ
      const { userId } = await this.tokenService.verifyRefreshToken(refreshToken)

      const refreshTokenInDB = await this.authRepository.findUniqueRefreshTokenIncludeUserRole({ token: refreshToken })

      if (!refreshTokenInDB) {
        throw new UnauthorizedException('Refresh token has been revoked')
      }
      const {
        deviceId,
        user: {
          roleId,
          role: { name: roleName },
        },
      } = refreshTokenInDB
      //Cập nhật device
      const $updateDevice = this.authRepository.updateDevice(deviceId, {
        ip,
        userAgent,
      })

      //Xóa RT cũ
      const $deleteRefreshToken = this.authRepository.deleteRefreshToken({
        token: refreshToken,
      })

      //Tạo AT và RT mới và cập nhật
      const $token = this.generateTokens({ userId, deviceId, roleId, roleName })

      const [, , tokens] = await Promise.all([$updateDevice, $deleteRefreshToken, $token])
      return tokens
    } catch (error) {
      // mặc định throw UnauthorizedException là instaneOf HttpException
      if (error instanceof HttpException) {
        throw error
      }
      throw new UnauthorizedException()
    }
  }

  async logout(refreshToken: string) {
    try {
      await this.tokenService.verifyRefreshToken(refreshToken)
      const deletedRefreshToken = await this.authRepository.deleteRefreshToken({ token: refreshToken })
      await this.authRepository.updateDevice(deletedRefreshToken.deviceId, { isActive: false })
      return { message: 'Logout successfully' }
    } catch (error) {
      if (isNotFoundPrismaError(error)) throw new UnauthorizedException('Refresh token has been revoked')
      throw new UnauthorizedException()
    }
  }
}
