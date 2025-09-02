import { ZodSerializerDto } from 'nestjs-zod'
import { LoginBodyDTO, RegisterBodyDTO, RegisterResDTO, SendOTPBodyDTO } from './auth.dto'
import { AuthService } from './auth.service'
import { Body, Controller, Ip, Post } from '@nestjs/common'
import { UserAgent } from 'src/shared/decorators/user-agent.decorator'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ZodSerializerDto(RegisterResDTO)
  register(@Body() body: RegisterBodyDTO) {
    return this.authService.register(body)
  }

  @Post('otp')
  sendOTP(@Body() body: SendOTPBodyDTO) {
    return this.authService.sendTOP(body)
  }

  @Post('login')
  login(@Body() body: LoginBodyDTO, @UserAgent() userAgent: string, @Ip() ip: string) {
    return this.authService.login({
      ...body,
      userAgent,
      ip,
    })
  }

  // @Post('refresh-token')
  // @HttpCode(HttpStatus.OK)
  // refreshToken(@Body() body: any) {
  //   return this.authService.refreshToken(body.refreshToken)
  // }

  // @Post('logout')
  // logout(@Body() body: any) {
  //   return this.authService.logout(body.refreshToken)
  // }
}
