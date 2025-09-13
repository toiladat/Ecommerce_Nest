import { TwoFactorService } from './../../shared/services/2fa.service'
import { EmailService } from 'src/shared/services/email.service'
import { SharedUserRepository } from 'src/shared/repositories/shared-user.repo'
import { AuthRepository } from './auth.repo'
import { RolesService } from './roles.service'
import { HashingService } from 'src/shared/services/hashing.service'
import { HttpException, Injectable } from '@nestjs/common'
import { generateOTP, isNotFoundPrismaError, isUniqueConstraintPrismaError } from 'src/shared/helpers'
import {
  ForgotPasswordBodyType,
  LoginBodyType,
  RefreshTokenBodyType,
  RegisterBodyType,
  SendOTPBodyType,
} from './auth.model'
import { addMilliseconds } from 'date-fns'
import envConfig from 'src/shared/config'
import ms, { StringValue } from 'ms'
import { TypeOfVerificationCode, TypeOfVerificationCodeType } from 'src/shared/constants/auth.constant'
import { TokenService } from 'src/shared/services/token.service'
import { AccessTokenPayloadCreate } from 'src/shared/types/jwt.type'
import {
  EmailAlreadyExistsException,
  EmailNotFoundException,
  FailedToSendOTPException,
  InvalidOTPException,
  InvalidPasswordException,
  InvalidTOTPAndCodeException,
  OTPExpiredException,
  RefreshTokenAlreadyUsedException,
  TOTPAlreadyEnableException,
  UnauthorizedAccessException,
} from 'src/routes/auth/error.model'

@Injectable()
export class AuthService {
  constructor(
    private readonly hashingService: HashingService,
    private readonly rolesService: RolesService,
    private readonly authRepository: AuthRepository,
    private readonly sharedUserRepository: SharedUserRepository,
    private readonly emailService: EmailService,
    private readonly tokenService: TokenService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  async validateVerificationCode({ email,code, type }: { email: string; code: string, type: TypeOfVerificationCodeType }) {
    const vevificationCode = await this.authRepository.findUniqueVerificationCode({
      email_type: {
        email: email,
        type: type,
      },
    })
    if (!vevificationCode || vevificationCode.code !== code) {
      throw InvalidOTPException
    }
    if (vevificationCode.expiresAt < new Date()) {
      throw OTPExpiredException
    }
    return vevificationCode
  }

  async register(body: RegisterBodyType) {
    try {
      await this.validateVerificationCode({
        email: body.email,
        code:body.code,
        type: TypeOfVerificationCode.REGISTER,
      })

      const clientRoleId = await this.rolesService.getClientRoleId()
      const hashPassword = await this.hashingService.hash(body.password)

      const [user] = await Promise.all([
        await this.authRepository.createUser({
          email: body.email,
          name: body.name,
          phoneNumber: body.phoneNumber,
          roleId: clientRoleId,
          password: hashPassword,
        }),
        await this.authRepository.deleteVerificationCode({
          email_type: {
            email: body.email,
            type: TypeOfVerificationCode.REGISTER,
          },
        }),
      ])
      return user
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw EmailAlreadyExistsException
      }
      throw error
    }
  }

  async sendTOP(body: SendOTPBodyType) {
    //Kiểm tra user tồn tại
    const user = await this.sharedUserRepository.findUnique({ email: body.email })
    if (body.type === TypeOfVerificationCode.REGISTER && user) throw EmailAlreadyExistsException
    if (body.type === TypeOfVerificationCode.FORGOT_PASSWORD && !user) throw EmailNotFoundException

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
      throw FailedToSendOTPException
    }
    return { message: 'Send OTP Successfully' }
  }

  async login(body: LoginBodyType & { userAgent: string; ip: string }) {
    const user = await this.authRepository.findUniqueUserIncludeRole({
      email: body.email,
    })

    if (!user) {
      throw EmailNotFoundException
    }

    const isPasswordMatch = await this.hashingService.compare(body.password, user.password)
    if (!isPasswordMatch) {
      throw InvalidPasswordException
    }

    // Nếu user đã bật 2FA thì kiểm tra 2FA TOTP code hoặc OTP code (email)
    if (user.totpSecret) {
      //Nếu không có totp code và code thì thông báo cho client biết
      if (!body.totpCode && !body.code) throw InvalidTOTPAndCodeException

      // Kiểm tra TOTP code hợp lệ

      if (body.totpCode) {
        const isValid = this.twoFactorService.verifyTOTP({
          email: user.email,
          secret: user.totpSecret,
          token: body.totpCode
        })

        if (!isValid) throw InvalidOTPException
      }
      else if (body.code) {
        //Kiểm tra otp có hợp lê không
        await this.validateVerificationCode({
          email: user.email,
          code:body.code,
          type: TypeOfVerificationCode.LOGIN
        })
      }
    }

    // Tạo device
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
        throw RefreshTokenAlreadyUsedException
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
      throw UnauthorizedAccessException
    }
  }

  async logout(refreshToken: string) {
    try {
      await this.tokenService.verifyRefreshToken(refreshToken)
      const deletedRefreshToken = await this.authRepository.deleteRefreshToken({ token: refreshToken })
      await this.authRepository.updateDevice(deletedRefreshToken.deviceId, { isActive: false })
      return { message: 'Logout successfully' }
    } catch (error) {
      if (isNotFoundPrismaError(error)) throw RefreshTokenAlreadyUsedException

      throw UnauthorizedAccessException
    }
  }

  async forgotPassword(body: ForgotPasswordBodyType) {
    const { email, newPassword } = body
    // Kiểm tra email có db

    const user = await this.sharedUserRepository.findUnique({
      email,
    })
    if (!user) throw EmailNotFoundException

    // kiểm tra otp hợp lệ
    await this.validateVerificationCode({
      email,
      code: body.code,
      type: TypeOfVerificationCode.FORGOT_PASSWORD,
    })

    const hashPassword = await this.hashingService.hash(newPassword)

    await Promise.all([
      // cập nhật password mới
      await this.authRepository.updateUser(
        {
          id: user.id,
        },
        { password: hashPassword },
      ),
      // xóa otp
      await this.authRepository.deleteVerificationCode({
        email_type: {
          email: email,
          type: TypeOfVerificationCode.FORGOT_PASSWORD,
        },
      }),
    ])
    return {
      message: 'Password changed successfully',
    }
  }

  async setupTwoFactorAuth(userId: number) {
    // Lấy thông tin user ( đã tồn tại & bật 2FA chưa)
    const user = await this.sharedUserRepository.findUnique({
      id: userId,
    })
    if (!user) {
      throw EmailNotFoundException
    }

    if (user.totpSecret) {
      throw TOTPAlreadyEnableException
    }

    // Tạo secret và uri
    const { secret, uri } = this.twoFactorService.generateTOTPSecrete(user.email)

    // Cập nhật secret vào user
    await this.authRepository.updateUser(
      {
        id: userId,
      },
      { totpSecret: secret },
    )

    // Trả về
    return { secret, uri }
  }
}
