// components/DateRangeSelector.tsx
import { memo } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DateRange } from 'react-day-picker'

interface DateRangeSelectorProps {
  dateRange: DateRange | undefined
  onSelect: (range: DateRange | undefined) => void
}

export const DateRangeSelector = memo(({ dateRange, onSelect }: DateRangeSelectorProps) => (
  <Card className="shadow-lg">
    <CardHeader>
      <CardTitle className="text-xl font-semibold">Select Date Range</CardTitle>
    </CardHeader>
    <CardContent>
      <Calendar
        mode="range"
        selected={dateRange}
        onSelect={onSelect}
        numberOfMonths={1}
        className="rounded-md"
        showOutsideDays={false}
        classNames={{
          months: "space-y-4",
          head_cell: "text-muted-foreground font-normal text-sm px-2",
          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
          day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 mx-auto flex items-center justify-center",
          day_range_start: "day-range-start",
          day_range_end: "day-range-end",
          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          table: "w-full border-collapse space-y-1",
          head_row: "flex space-x-5",
          row: "flex w-full mt-2 space-x-4",
        }}
      />
    </CardContent>
  </Card>
))

DateRangeSelector.displayName = 'DateRangeSelector'