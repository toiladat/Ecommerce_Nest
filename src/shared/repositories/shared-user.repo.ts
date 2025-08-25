import { PrismaService } from 'src/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { UserType } from '../models/shared-user.model'

@Injectable()
export class SharedUserRepository {
  constructor(private readonly pismaService: PrismaService) {}

  findUnique(uniqueObject: { email: string } | { id: number }): Promise<UserType | null> {
    return this.pismaService.user.findUnique({
      where: uniqueObject,
    })
  }
}
