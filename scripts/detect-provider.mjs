import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

dotenv.config({ path: resolve(root, '.env') })

const url = process.env.DATABASE_URL || ''
const detected = url.startsWith('mysql://') ? 'mysql' : 'postgresql'

const schemaPath = resolve(root, 'prisma', 'schema.prisma')
let schema = readFileSync(schemaPath, 'utf-8')

schema = schema.replace(
  /provider\s*=\s*"(postgresql|mysql)"/,
  `provider = "${detected}"`
)

writeFileSync(schemaPath, schema, 'utf-8')
console.log(`Provider set to: ${detected}`)
