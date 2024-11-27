'use server'

import { db } from '@/lib/db/drizzle'
import { userAvailability } from '@/lib/db/schema'
import { getUser } from '../db/queries'

export async function createUserAvailabilityAction(data: {
  date: string
  isAvailableAM: boolean
  isAvailablePM: boolean
  isAvailableNight: boolean
}) {
  try {
    const user = await getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const [availability] = await db
      .insert(userAvailability)
      .values({
        userId: user.id.toString(), // Convert number to string
        date: data.date,
        isAvailableAM: data.isAvailableAM,
        isAvailablePM: data.isAvailablePM,
        isAvailableNight: data.isAvailableNight,
      })
      .onConflictDoUpdate({
        target: [userAvailability.userId, userAvailability.date],
        set: {
          isAvailableAM: data.isAvailableAM,
          isAvailablePM: data.isAvailablePM,
          isAvailableNight: data.isAvailableNight,
        },
      })
      .returning()

    return { success: true, data: availability }
  } catch (error) {
    console.error('Create availability error:', error)
    return { success: false, error: 'Failed to update availability' }
  }
}