import { Prisma } from '@prisma/client'

//Kiểu trả về error is Prisma.PrismaClientKnownRequestError là type predicate để error được biết là kiểu Prisma
export const isUniqueConstraintPrismaError = (error: any): error is Prisma.PrismaClientKnownRequestError => {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export const isNotFoundPrismaError = (error: any): error is Prisma.PrismaClientKnownRequestError => {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
}
