export const REQUEST_USER_KEY='user'

export const AuthType = {
  Bearer: 'Bearer',
  None: 'None',
  APIKey: 'ApiKey'
} as const
//AuthTypeType là union type của tất cả các giá trị đó: "Bearer" | "None" | "ApiKey".
export type AuthTypeType = (typeof AuthType)[keyof typeof AuthType]

export const ConditionGuard = {
  And:'and',
  Or: 'or'
} as const
export type ConditionGuardType = (typeof ConditionGuard)[keyof typeof ConditionGuard]