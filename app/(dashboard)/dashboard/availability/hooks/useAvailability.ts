// hooks/useAvailability.ts
import { useState, useCallback } from 'react'
import { DateRange } from 'react-day-picker'
import { useUser } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import { createUserAvailabilityAction, getUserAvailabilityAction } from '@/lib/actions/availability'
import { format, startOfDay, isSameDay, eachDayOfInterval } from 'date-fns'
import { AvailabilityEntry, Availability } from '../types/availability'

export function useAvailability() {
  const { user } = useUser()
  const { toast } = useToast()
  const [selectedDates, setSelectedDates] = useState<AvailabilityEntry[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [currentAvailability, setCurrentAvailability] = useState<Availability>({
    morning: false,
    afternoon: false,
    night: false,
  })

  const loadExistingAvailability = useCallback(async () => {
    const result = await getUserAvailabilityAction()
    if (result.success && result.data) {
      setSelectedDates(result.data.map(entry => ({
        date: entry.date,
        availability: {
          morning: !!entry.availability.morning,
          afternoon: !!entry.availability.afternoon,
          night: !!entry.availability.night
        }
      })))
    }
  }, [])

  const handleRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    if (range?.from) {
      const existingEntry = selectedDates.find(
        (entry) => entry.date && range.from && isSameDay(entry.date, range.from)
      )
      if (existingEntry) {
        setCurrentAvailability(existingEntry.availability)
        toast({
          title: "Existing Availability Found",
          description: "You can modify the availability for this date.",
        })
      } else {
        setCurrentAvailability({ morning: false, afternoon: false, night: false })
      }
    }
  }

  const handleAvailabilityChange = (type: keyof Availability) => {
    setCurrentAvailability((prev) => ({ ...prev, [type]: !prev[type] }))
  }

  const handleAddAvailability = () => {
    if (!dateRange?.from || !dateRange?.to) return

    const newEntries: AvailabilityEntry[] = eachDayOfInterval({
      start: dateRange.from,
      end: dateRange.to,
    }).map((date) => ({
      date,
      availability: { ...currentAvailability },
    }))

    setSelectedDates((prev) => {
      const filtered = prev.filter(
        (entry) => entry.date && !newEntries.some((newEntry) => isSameDay(newEntry.date, entry.date))
      )
      return [...filtered, ...newEntries].sort((a, b) => a.date.getTime() - b.date.getTime())
    })

    setDateRange(undefined)
    toast({
      title: "Availability Updated",
      description: `Availability ${newEntries.length > 1 ? 'set' : 'updated'} for ${newEntries.length} day(s)`,
    })
  }

  const handleSaveAvailability = async () => {
    if (!user) return
    
    try {
      const promises = selectedDates.map(entry => 
        createUserAvailabilityAction({
          date: format(startOfDay(entry.date), 'yyyy-MM-dd'),
          isAvailableAM: entry.availability.morning,
          isAvailablePM: entry.availability.afternoon,
          isAvailableNight: entry.availability.night,
        })
      )
      
      await Promise.all(promises)
      toast({
        title: "Availability Saved",
        description: "Your availability has been successfully updated.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save availability. Please try again.",
        variant: "destructive",
      })
    }
  }

  return {
    selectedDates,
    dateRange,
    currentAvailability,
    handleRangeSelect,
    handleAvailabilityChange,
    handleAddAvailability,
    handleSaveAvailability,
    loadExistingAvailability
  }
}