import { LoginBodyDTO, LoginResDTO, LogoutBodyDTO, LogoutResDTO, RefreshTokenBodyDTO, RefreshTokenResDTO, RegisterBodyDTO, RegisterResDTO } from './auth.dto'
import { AuthService } from './auth.service'
import { Body, Controller, HttpCode, HttpStatus, Post, SerializeOptions } from '@nestjs/common'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @SerializeOptions({ type: RegisterResDTO })
  @Post('register')
  register(@Body() body: RegisterBodyDTO) {
    return this.authService.register(body)
  }

  @SerializeOptions({ type: LoginResDTO })
  @Post('login')
  login(@Body() body: LoginBodyDTO) {
    return this.authService.login(body)
  }

  @SerializeOptions({ type: RefreshTokenResDTO})
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  refreshToken(@Body() body: RefreshTokenBodyDTO) {
    return this.authService.refreshToken(body.refreshToken)
  }

  @SerializeOptions({type: LogoutResDTO})
  @Post('logout')
  logout(@Body() body: LogoutBodyDTO) {
    return this.authService.logout(body.refreshToken)
  }
}
