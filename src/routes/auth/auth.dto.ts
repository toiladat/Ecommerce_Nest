import { Exclude } from 'class-transformer'
import { IsString, Length } from 'class-validator'
import { Match } from 'src/shared/decorators/custom-validator.decorator'

export class LoginBodyDTO {
  @IsString()
  email: string

  @IsString()
  @Length(3, 20, { message: 'Password have to 6 -20 character' })
  password: string
}

export class RegisterBodyDTO extends LoginBodyDTO {
  @IsString()
  name: string

  @IsString()
  @Match('password', { message: 'Password do not match'})
  confirmPassword: string
}

export class LoginResDTO {
  accessToken: string
  refreshToken: string
}

export class RegisterResDTO {
  id: number
  email: string
  name: string
  @Exclude() password: string
  createdAt: Date
  updatedAt: Date
}

export class RefreshTokenBodyDTO {
  @IsString()
  refreshToken: string
}

export class RefreshTokenResDTO extends LoginResDTO {}

export class LogoutBodyDTO extends RefreshTokenBodyDTO {}

export class LogoutResDTO {
  message: string
}