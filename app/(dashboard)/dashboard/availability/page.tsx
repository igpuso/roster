'use client'

import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useUser } from '@/lib/auth'
import { createUserAvailabilityAction } from '@/lib/actions/availability'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { DateRange } from 'react-day-picker'
import { addDays, eachDayOfInterval, isSameDay } from 'date-fns'

type Availability = {
  morning: boolean
  afternoon: boolean
  night: boolean
}

type AvailabilityEntry = {
  date: Date
  availability: Availability
}

export default function AvailabilityPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const [selectedDates, setSelectedDates] = useState<AvailabilityEntry[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [currentAvailability, setCurrentAvailability] = useState<Availability>({
    morning: false,
    afternoon: false,
    night: false,
  })

  const handleRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    if (range?.from) {
      const existingEntry = selectedDates.find(
        (entry) => entry.date && range.from && isSameDay(entry.date, range.from)
      )
      if (existingEntry) {
        setCurrentAvailability(existingEntry.availability)
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
        (entry) => entry.date && dateRange.from && !newEntries.some((newEntry) => isSameDay(newEntry.date, entry.date))
      )
      return [...filtered, ...newEntries]
    })

    setDateRange(undefined)
    toast({
      title: "Availability Added",
      description: `Availability set for ${newEntries.length} day(s)`,
    })
  }

  const handleSaveAvailability = async () => {
    if (!user) return

    try {
      for (const entry of selectedDates) {
        await createUserAvailabilityAction({
          date: entry.date.toISOString().split('T')[0],
          isAvailableAM: entry.availability.morning,
          isAvailablePM: entry.availability.afternoon,
          isAvailableNight: entry.availability.night,
        })
      }
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

  return (
    <div className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Select Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleRangeSelect}
              numberOfMonths={2}
              className="rounded-md border"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Set Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { id: 'morning', label: 'Morning (6AM - 2PM)' },
                { id: 'afternoon', label: 'Afternoon (2PM - 10PM)' },
                { id: 'night', label: 'Night (10PM - 6AM)' }
              ].map(({ id, label }) => (
                <div key={id} className="flex items-center space-x-2">
                  <Checkbox
                    id={id}
                    checked={currentAvailability[id as keyof Availability]}
                    onCheckedChange={() => handleAvailabilityChange(id as keyof Availability)}
                  />
                  <label htmlFor={id}>{label}</label>
                </div>
              ))}
              <Button 
                onClick={handleAddAvailability} 
                className="mt-4"
                disabled={!dateRange?.from || !dateRange?.to}
              >
                Add Availability for Selected Range
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Selected Dates and Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {selectedDates.map((entry) => (
              <div key={entry.date.toISOString()} className="flex items-center justify-between border-b pb-2">
                <span>{entry.date.toDateString()}</span>
                <div className="flex space-x-2">
                  {entry.availability.morning && <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">Morning</span>}
                  {entry.availability.afternoon && <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Afternoon</span>}
                  {entry.availability.night && <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded">Night</span>}
                </div>
              </div>
            ))}
          </div>
          {selectedDates.length > 0 && (
            <Button onClick={handleSaveAvailability} className="mt-4">Save All Availability</Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

