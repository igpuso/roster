'use server'

import { db } from '@/lib/db/drizzle'
import { userAvailability } from '@/lib/db/schema'
import { getUser } from '../db/queries'
import { asc, desc, eq, and } from 'drizzle-orm'

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
        userId: user.id,
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

export async function getUserAvailabilityAction() {
  try {
    const user = await getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const availabilities = await db
      .select()
      .from(userAvailability)
      .where(eq(userAvailability.userId, user.id))
      .orderBy(asc(userAvailability.date))

    return {
      success: true,
      data: availabilities.map(row => ({
        date: new Date(row.date),
        availability: {
          morning: row.isAvailableAM,
          afternoon: row.isAvailablePM,
          night: row.isAvailableNight
        }
      }))
    }
  } catch (error) {
    console.error('Get availability error:', error)
    return { success: false, error: 'Failed to fetch availability' }
  }
}

export async function updateUserAvailabilityAction(data: {
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

    const [updated] = await db
      .update(userAvailability)
      .set({
        isAvailableAM: data.isAvailableAM,
        isAvailablePM: data.isAvailablePM,
        isAvailableNight: data.isAvailableNight,
      })
      .where(
        and(
          eq(userAvailability.userId, user.id),
          eq(userAvailability.date, data.date)
        )
      )
      .returning()

    if (!updated) {
      return { success: false, error: 'Availability not found' }
    }

    return { success: true, data: updated }
  } catch (error) {
    console.error('Update availability error:', error)
    return { success: false, error: 'Failed to update availability' }
  }
}

