'use client'

import { useEffect } from 'react'
import { DateRangeSelector } from './components/DateRangeSelector'
import { AvailabilitySelector } from './components/AvailabilitySelector'
import { SelectedDatesDisplay } from './components/SelectedDatesDisplay'
import { useAvailability } from './hooks/useAvailability'

export default function AvailabilityPage() {
  const {
    selectedDates,
    dateRange,
    currentAvailability,
    handleRangeSelect,
    handleAvailabilityChange,
    handleAddAvailability,
    handleSaveAvailability,
    loadExistingAvailability
  } = useAvailability()

  useEffect(() => {
    loadExistingAvailability()
  }, [loadExistingAvailability])

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="grid gap-6 md:grid-cols-2">
        <DateRangeSelector 
          dateRange={dateRange}
          onSelect={handleRangeSelect}
        />
        <AvailabilitySelector 
          currentAvailability={currentAvailability}
          onAvailabilityChange={handleAvailabilityChange}
          onAddAvailability={handleAddAvailability}
          isAddDisabled={!dateRange?.from || !dateRange?.to}
        />
      </div>
      <SelectedDatesDisplay 
        selectedDates={selectedDates}
        onSave={handleSaveAvailability}
      />
    </div>
  )
}