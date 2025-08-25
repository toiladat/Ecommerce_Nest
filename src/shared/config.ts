import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'
import { z } from 'zod'

config({
  path: '.env',
})

// Kiem tra .env
if (!fs.existsSync(path.resolve('.env'))) {
  console.log('Khong thay .env')
  process.exit(1)
}
const conifgSchema = z.object({
  DATABASE_URL: z.string(),
  ACCESS_TOKEN_SECRET: z.string(),
  ACCESS_TOKEN_EXPIRES_IN: z.string(),
  REFRESH_TOKEN_SECRET: z.string(),
  REFRESH_TOKEN_EXPIRES_IN: z.string(),
  SECERET_API_KEY: z.string(),

  ADMIN_NAME: z.string(),
  ADMIN_PASSWORD: z.string(),
  ADMIN_EMAIL: z.string(),
  ADMIN_PHONE: z.string(),

  OTP_EXPIRES_IN : z.string()
})

const configServer = conifgSchema.safeParse(process.env)

if (!configServer.success) {
  console.log('Cac gia tri trong .env khong hop le')
  console.error(configServer.error)
  process.exit(1)
}

const envConfig = configServer.data
export default envConfig
