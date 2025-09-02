import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { AccessTokenPayload } from '../types/jwt.type'
import { REQUEST_USER_KEY } from '../constants/auth.constant'

export const ActivateUser = createParamDecorator((field: keyof AccessTokenPayload | undefined, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest()
  const user: AccessTokenPayload | undefined = request[REQUEST_USER_KEY]
  return field ? user?.[field] : user
})
