'use server'
import { cookies } from 'next/headers'
import { getSession, verifyToken } from '../auth/session'

export async function getCurrentSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  if (!session) return null
  return await verifyToken(session)
}
