import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { SharedModule } from './shared/shared.module'
import { AuthModule } from './routes/auth/auth.module'
import CustomZodValidationPipe from './shared/pipes/custom-zod-validation.pipe'
import { ZodSerializerInterceptor } from 'nestjs-zod'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { HttpExceptionFilter } from './shared/filters/http-exception.filter'

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      //NestJS sẽ áp dụng ZodValidationPipe cho mọi DTO.
      //DTO nào extends từ createZodDto (ví dụ RegisterBodyDTO) sẽ được validate tự động theo schema bạn truyền vào.
      provide: APP_PIPE,
      useClass: CustomZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR, // Tất cả controllers đều phải chạy qua ClassSerializerInterceptor, để validate data trước khi response
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_FILTER,//bắt và xử lý mọi exception trên toàn ứng dụng, không cần khai báo lại từng chỗ.
      useClass: HttpExceptionFilter
    }
  ],
})
export class AppModule {}
