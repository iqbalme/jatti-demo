import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

function parseMySqlUrl(url: string) {
  const u = new URL(url)
  return {
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  }
}

const url = process.env.DATABASE_URL || ''
const isMySql = url.startsWith('mysql://')

let adapter: PrismaPg | PrismaMariaDb
if (isMySql) {
  const opts = parseMySqlUrl(url)
  adapter = new PrismaMariaDb({
    host: opts.host,
    port: opts.port,
    user: opts.user,
    password: opts.password,
    database: opts.database,
    connectionLimit: 5,
  })
} else {
  const isServerless = process.env.VERCEL === '1'
  adapter = new PrismaPg({
    connectionString: url,
    max: isServerless ? 3 : 5,
    idleTimeoutMillis: 10000,
  })
}

export const prisma = new PrismaClient({ adapter })
