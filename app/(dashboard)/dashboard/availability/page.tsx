'use client';

import { useState, useTransition } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useUser } from '@/lib/auth';
import { createUserAvailabilityAction } from '@/lib/actions/roster';
import { Loader2 } from 'lucide-react';

export default function AvailabilityPage() {
  const { user } = useUser();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availability, setAvailability] = useState({
    isAvailableAM: true,
    isAvailablePM: true,
    isAvailableNight: true,
  });
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<{ success?: string; error?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !user) return;

    const data = {
      userId: user.id,
      date: selectedDate.toISOString().split('T')[0],
      isAvailableAM: availability.isAvailableAM,
      isAvailablePM: availability.isAvailablePM,
      isAvailableNight: availability.isAvailableNight,
    };

    startTransition(async () => {
      const result = await createUserAvailabilityAction(data);
      if ('error' in result) {
        setState({ error: result.error });
      } else {
        setState({ success: 'Availability saved successfully!' });
      }
    });
  };

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium mb-6">Availability Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Set Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <Checkbox
                    checked={availability.isAvailableAM}
                    onCheckedChange={(checked) =>
                      setAvailability((prev) => ({ ...prev, isAvailableAM: checked === true }))
                    }
                  />
                  <span>Morning Shift (AM)</span>
                </Label>

                <Label className="flex items-center space-x-2">
                  <Checkbox
                    checked={availability.isAvailablePM}
                    onCheckedChange={(checked) =>
                      setAvailability((prev) => ({ ...prev, isAvailablePM: checked === true }))
                    }
                  />
                  <span>Afternoon Shift (PM)</span>
                </Label>

                <Label className="flex items-center space-x-2">
                  <Checkbox
                    checked={availability.isAvailableNight}
                    onCheckedChange={(checked) =>
                      setAvailability((prev) => ({ ...prev, isAvailableNight: checked === true }))
                    }
                  />
                  <span>Night Shift</span>
                </Label>
              </div>

              {state.error && <p className="text-red-500 text-sm">{state.error}</p>}
              {state.success && <p className="text-green-500 text-sm">{state.success}</p>}

              <Button type="submit" className="w-full" disabled={!selectedDate || isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Availability'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
