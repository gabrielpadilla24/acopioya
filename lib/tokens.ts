import { randomBytes } from 'node:crypto'

export function generarTokenAdmin(): string {
  return 'tk_' + randomBytes(16).toString('base64url')
}

export function generarTokenVoluntario(): string {
  return 'vg_' + randomBytes(16).toString('base64url')
}
