import { Injectable } from '@nestjs/common'
import { Resend } from 'resend'
import envConfig from '../config'
import OTPEmail from 'emails/otp'
@Injectable()
export class EmailService {
  private resend: Resend
  constructor() {
    this.resend = new Resend(envConfig.RESEND_API_KEY)
  }
  sendOTP(payload: { email: string; code: string }) {
    const subject= 'Mã xác thực ECOM của bạn'
    return this.resend.emails.send({
      from: 'ECOM <no-reply@toiladat.online>',
      to: [payload.email],
      subject,
      react: <OTPEmail otpCode={payload.code} title={subject}/>
    })
  }
}
