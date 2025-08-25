import { z } from "zod"
import { UserStatus } from "../constants/auth.constant"

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
