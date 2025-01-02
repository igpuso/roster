// components/AvailabilitySelector.tsx
import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Availability } from '../types/availability'

interface AvailabilitySelectorProps {
  currentAvailability: Availability
  onAvailabilityChange: (type: keyof Availability) => void
  onAddAvailability: () => void
  isAddDisabled: boolean
}

export const AvailabilitySelector = memo(({
  currentAvailability,
  onAvailabilityChange,
  onAddAvailability,
  isAddDisabled
}: AvailabilitySelectorProps) => (
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
              onCheckedChange={() => onAvailabilityChange(id as keyof Availability)}
              className="h-5 w-5"
            />
            <label htmlFor={id} className="text-sm font-medium leading-none">
              {label}
            </label>
          </div>
        ))}
        <Button 
          onClick={onAddAvailability} 
          className="w-full mt-6"
          disabled={isAddDisabled}
        >
          Add Availability for Selected Range
        </Button>
      </div>
    </CardContent>
  </Card>
))