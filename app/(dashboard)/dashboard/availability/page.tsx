'use client'

import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useUser } from '@/lib/auth'
import { createUserAvailabilityAction } from '@/lib/actions/availability'

export default function AvailabilityPage() {
  const { user } = useUser()
  const [formState, setFormState] = useState({
    date: new Date(),
    availability: {
      morning: true,
      afternoon: true,
      night: true
    },
    status: { loading: false, message: '' }
  })

  const handleChange = async (type: 'morning' | 'afternoon' | 'night' | 'date', value: any) => {
    if (!user) return

    setFormState(prev => ({
      ...prev,
      [type === 'date' ? 'date' : `availability.${type}`]: value,
      status: { loading: true, message: '' }
    }))

    try {
      const result = await createUserAvailabilityAction({
        date: formState.date.toISOString().split('T')[0],
        isAvailableAM: type === 'morning' ? value : formState.availability.morning,
        isAvailablePM: type === 'afternoon' ? value : formState.availability.afternoon,
        isAvailableNight: type === 'night' ? value : formState.availability.night,
      })

      setFormState(prev => ({
        ...prev,
        status: { 
          loading: false, 
          message: result.success ? 'Saved!' : (result.error || 'Failed to save')
        }
      }))
    } catch (error) {
      setFormState(prev => ({
        ...prev,
        status: { loading: false, message: 'Failed to save' }
      }))
    }
  }

  return (
    <div className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <Calendar
              mode="single"
              selected={formState.date}
              onSelect={(date) => date && handleChange('date', date)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="space-y-4 pt-6">
              {[
                { id: 'morning', label: 'Morning (6AM - 2PM)' },
                { id: 'afternoon', label: 'Afternoon (2PM - 10PM)' },
                { id: 'night', label: 'Night (10PM - 6AM)' }
              ].map(({ id, label }) => (
                <div key={id} className="flex items-center space-x-2">
                  <Checkbox
                    id={id}
                    checked={formState.availability[id as keyof typeof formState.availability]}
                    onCheckedChange={(checked) => 
                      handleChange(id as keyof typeof formState.availability, checked === true)
                    }
                  />
                  <label htmlFor={id}>{label}</label>
                </div>
              ))}

              {formState.status.message && (
                <p className={`text-sm ${
                  formState.status.message === 'Saved!' 
                    ? 'text-green-500' 
                    : 'text-red-500'
                }`}>
                  {formState.status.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}