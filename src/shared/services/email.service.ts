import { Injectable } from '@nestjs/common'
import { Resend } from 'resend'
import envConfig from '../config'

@Injectable()
export class EmailService {
  private resend: Resend
  constructor() {
    this.resend = new Resend(envConfig.RESEND_API_KEY)
  }
  sendOTP(payload: { email: string; code: string }) {
    return this.resend.emails.send({
      from: 'ECOM <no-reply@toiladat.online>',
      to: [payload.email],
      subject: 'Mã xác thực ECOM của bạn',
      text: `Mã OTP ECOM: ${payload.code}. Hiệu lực 5 phút. Nếu không phải bạn, hãy bỏ qua.`,
      html: `<p>Xin chào,</p><p>Mã OTP ECOM của bạn là <b>${payload.code}</b> (hiệu lực 5 phút).</p><p>Nếu không phải bạn yêu cầu, xin bỏ qua.</p>`,
    })
  }
}
