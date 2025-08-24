import { createZodDto } from 'nestjs-zod'
import { RegisterBodySchema, RegisterResSchema } from './auth.model'

//NestJS mặc định chỉ biết validate bằng class-validator (ValidationPipe).
//Để NestJS hiểu được DTO sinh ra từ createZodDto, bạn phải bật ZodValidationPipe làm global pipe.
export class RegisterBodyDTO extends createZodDto(RegisterBodySchema) {}

export class RegisterResDTO extends createZodDto(RegisterResSchema) {}
