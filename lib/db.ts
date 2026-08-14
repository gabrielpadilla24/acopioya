import 'server-only'
import postgres from 'postgres'

declare global {
  // eslint-disable-next-line no-var
  var __sql: postgres.Sql | undefined
}

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error(
    'Falta la variable de entorno DATABASE_URL. ' +
      'Agrégala a .env.local para desarrollo local.'
  )
}
const dbUrl: string = url

// prepare:false requerido para poolers en modo transacción (Supabase Transaction Pooler):
// cada query puede ir a una conexión distinta, lo que hace que los prepared
// statements fallen intermitentemente en producción.
function crearCliente(): postgres.Sql {
  return postgres(dbUrl, { prepare: false })
}

export const sql: postgres.Sql =
  globalThis.__sql ?? (globalThis.__sql = crearCliente())
