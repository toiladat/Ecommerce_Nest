import { TypeOfVerificationCode, UserStatus } from 'src/shared/constants/auth.constant'
import { z } from 'zod'

export const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password: z.string().min(2).max(100),

  name: z.string().min(1).max(20),
  phoneNumber: z.string().min(10).max(15),
  avatar: z.string().nullable(),
  totpSecret: z.string().nullable(),
  roleId: z.number().positive(),
  status: z.nativeEnum(UserStatus),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

//Nó nhận vào một Zod schema và suy ra type TypeScript tương ứng.
//Dùng z.infer thì type tự cập nhật theo schema. Nó giúp bạn không phải viết type tay, tránh sai lệch giữa schema
export type UserType = z.infer<typeof UserSchema>

export const RegisterBodySchema = UserSchema.pick({
  email: true,
  password: true,
  name: true,
  phoneNumber: true,
})
  .extend({
    confirmPassword: z.string().min(2).max(100),
  })
  .strict()
  .superRefine(({ confirmPassword, password }, context) => {
    if (confirmPassword !== password) {
      context.addIssue({
        code: 'custom',
        message: 'Password not match',
        path: ['confirmPassword'], // or password, là array nên format lại ở app.module
      })
    }
  })
export type RegisterBodyType = z.infer<typeof RegisterBodySchema>

export const RegisterResSchema = UserSchema.omit({
  password: true,
  totpSecret: true,
})
export type RegisterResType = z.infer<typeof RegisterResSchema>

export const VerificationCode = z.object({
  id: z.number(),
  email: z.string().email(),
  code: z.string().length(6),
  type: z.nativeEnum(TypeOfVerificationCode),
  expiresAt: z.date(),
  createdAt: z.date(),
})
export type VerificationCodeType = z.infer<typeof VerificationCode>

export const SendOTPBodySchema = VerificationCode.pick({
  email: true,
  type: true,
}).strict()
export type SendOTPBodyType = z.infer<typeof SendOTPBodySchema>
