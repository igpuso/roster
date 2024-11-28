'use client'

import { useEffect, useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useUser } from '@/lib/auth'
import { createUserAvailabilityAction, getUserAvailabilityAction } from '@/lib/actions/availability'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { DateRange } from 'react-day-picker'
import { addDays, eachDayOfInterval, isSameDay, format } from 'date-fns'

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

  useEffect(() => {
    const loadExistingAvailability = async () => {
      const result = await getUserAvailabilityAction()
      if (result.success && result.data) {
        // Map the data to ensure non-nullable booleans
        const mappedAvailabilities = result.data.map(entry => ({
          date: entry.date,
          availability: {
            morning: !!entry.availability.morning, // Convert to boolean
            afternoon: !!entry.availability.afternoon, // Convert to boolean
            night: !!entry.availability.night // Convert to boolean
          }
        }))
        setSelectedDates(mappedAvailabilities)
      }
    }
    loadExistingAvailability()
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
      // Remove any existing entries for the selected dates
      const filtered = prev.filter(
        (entry) => entry.date && !newEntries.some((newEntry) => isSameDay(newEntry.date, entry.date))
      )
      // Add the new/updated entries
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Select Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleRangeSelect}
              numberOfMonths={1}
              className="rounded-md"
              showOutsideDays={false}
              classNames={{
                months: "space-y-4",
                head_cell: "text-muted-foreground font-normal text-sm px-2", // Added padding
                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 mx-auto flex items-center justify-center", // Added mx-auto
                day_range_start: "day-range-start",
                day_range_end: "day-range-end",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                table: "w-full border-collapse space-y-1", // Added space-y-1
                head_row: "flex space-x-5", // Added space-x-2
                row: "flex w-full mt-2 space-x-4", // Added space-x-2 and mt-2
              }}
            />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Set Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                { id: 'morning', label: 'Morning (6AM - 2PM)' },
                { id: 'afternoon', label: 'Afternoon (2PM - 10PM)' },
                { id: 'night', label: 'Night (10PM - 6AM)' }
              ].map(({ id, label }) => (
                <div key={id} className="flex items-center space-x-3">
                  <Checkbox
                    id={id}
                    checked={currentAvailability[id as keyof Availability]}
                    onCheckedChange={() => handleAvailabilityChange(id as keyof Availability)}
                    className="h-5 w-5"
                  />
                  <label htmlFor={id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {label}
                  </label>
                </div>
              ))}
              <Button 
                onClick={handleAddAvailability} 
                className="w-full mt-6"
                disabled={!dateRange?.from || !dateRange?.to}
                variant="default"
              >
                Add Availability for Selected Range
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Selected Dates and Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {selectedDates.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No dates selected</p>
            ) : (
              selectedDates.map((entry) => (
                <div key={entry.date.toISOString()} 
                     className="flex items-center justify-between py-3 border-b last:border-0">
                  <span className="font-medium">
                    {format(entry.date, 'MMMM d, yyyy')}
                  </span>
                  <div className="flex gap-2">
                    {entry.availability.morning && 
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Morning
                      </span>
                    }
                    {entry.availability.afternoon && 
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Afternoon
                      </span>
                    }
                    {entry.availability.night && 
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Night
                      </span>
                    }
                  </div>
                </div>
              ))
            )}
          </div>
          {selectedDates.length > 0 && (
            <Button 
              onClick={handleSaveAvailability} 
              className="w-full mt-6"
              variant="default"
            >
              Save All Availability
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

