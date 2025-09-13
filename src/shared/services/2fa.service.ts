import { Injectable } from '@nestjs/common'
import * as OTPAuth from 'otpauth'
import envConfig from '../config'
@Injectable()
export class TwoFactorService {
  private createTOTP(email: string, secret?: string) {
    return new OTPAuth.TOTP({
      // name application
      issuer: envConfig.APP_NAME,
      // Account identifier.
      label: email,
      algorithm: 'SHA1',
      // Length of the generated tokens.
      digits: 6,
      // Interval of time for which a token is valid, in seconds.
      period: 30,

      // Nếu không truyền secret thì sẽ tự động generate
      secret: secret || new OTPAuth.Secret(),
      //   or: `OTPAuth.Secret.fromBase32("US3WHSG7X5KAPV27VANWKQHF3SH3HULL")`
      //   or: `new OTPAuth.Secret()`
    })
  }

  generateTOTPSecrete(email: string) {
    const totp = this.createTOTP(email)
    return {
      secret: totp.secret.base32,
      uri: totp.toString(),
    }
  }

  verifyTOTP({ email, secret, token }: { email: string; secret: string; token: string }): boolean {
    const totp = this.createTOTP(email,secret)
    // window 1 cho phép  otp trước hoặc sau otp hiện tại 1 nấc hợp lệ
    const delta = totp.validate({ token, window: 1 })
    return delta !== null
  }
}
