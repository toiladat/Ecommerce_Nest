import { Module, Global } from '@nestjs/common'
import { PrismaService } from './services/prisma.service'
import { HashingService } from './services/hashing.service'
import { TokenService } from './services/token.service'
import { JwtModule } from '@nestjs/jwt'
import { AccessTokenGuard } from './guards/access-token.guard'
import { APIKeyGuard } from './guards/api-key.guard'
import { AuthenticationGuard } from './guards/authentication.guard'

const sharedServices = [PrismaService, HashingService, TokenService]

@Global() // global mode
@Module({
  providers: [...sharedServices, AccessTokenGuard, APIKeyGuard, {
    provide: 'APP_GUARD',
    useClass: AuthenticationGuard
  }],
  exports: sharedServices, // global mode phải có exports
  imports:[JwtModule] //JwtModule là 1module, nên phải imports ở đây
})
export class SharedModule {}
