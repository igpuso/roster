// components/SelectedDatesDisplay.tsx
import { memo } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AvailabilityEntry } from '../types/availability'

interface SelectedDatesDisplayProps {
  selectedDates: AvailabilityEntry[]
  onSave: () => Promise<void>
}

export const SelectedDatesDisplay = memo(({ selectedDates, onSave }: SelectedDatesDisplayProps) => {
  const AvailabilityBadge = ({ type, isAvailable }: { type: string; isAvailable: boolean }) => {
    if (!isAvailable) return null

    const badgeStyles = {
      Morning: 'bg-green-100 text-green-800',
      Afternoon: 'bg-blue-100 text-blue-800',
      Night: 'bg-purple-100 text-purple-800'
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badgeStyles[type as keyof typeof badgeStyles]}`}>
        {type}
      </span>
    )
  }

  return (
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
              <div
                key={entry.date.toISOString()}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <span className="font-medium">
                  {format(entry.date, 'MMMM d, yyyy')}
                </span>
                <div className="flex gap-2">
                  <AvailabilityBadge 
                    type="Morning" 
                    isAvailable={entry.availability.morning} 
                  />
                  <AvailabilityBadge 
                    type="Afternoon" 
                    isAvailable={entry.availability.afternoon} 
                  />
                  <AvailabilityBadge 
                    type="Night" 
                    isAvailable={entry.availability.night} 
                  />
                </div>
              </div>
            ))
          )}
        </div>
        {selectedDates.length > 0 && (
          <Button 
            onClick={onSave} 
            className="w-full mt-6"
            variant="default"
          >
            Save All Availability
          </Button>
        )}
      </CardContent>
    </Card>
  )
})

SelectedDatesDisplay.displayName = 'SelectedDatesDisplay'