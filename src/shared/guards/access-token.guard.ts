import { TokenService } from './../services/token.service'
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { REQUEST_USER_KEY } from '../constants/auth.constant'

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    
    const accessToken: string = request.headers.authorization?.split(' ')[1]
    if (!accessToken) {
      return false
    }
    try {
      const decodedAccessToken = await this.tokenService.verifyAccessToken(accessToken)
      request[REQUEST_USER_KEY] = decodedAccessToken
      return true
    } catch {      
      throw new UnauthorizedException()
    }
  }
}
