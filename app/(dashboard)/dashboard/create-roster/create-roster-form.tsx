'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Loader2 } from "lucide-react";

interface RosterDetails {
  id: number;
  teamId: number;
  startDate: string;
  endDate: string;
  createdBy: number;
  createdAt: string;
}

interface ViewData {
  roster: RosterDetails;
  availability: any;
}

interface ApiError {
  message: string;
}

const api = {
  async fetchRosters() {
    const response = await fetch('/api/roster/list');
    if (!response.ok) throw new Error('Failed to fetch rosters');
    return response.json();
  },

  async createRoster(dateRange: DateRange) {
    const response = await fetch('/api/roster/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: dateRange.from?.toISOString(),
        endDate: dateRange.to?.toISOString(),
      }),
    });
    if (!response.ok) throw new Error('Failed to create roster');
    return response.json();
  },

  async fetchAvailability(startDate: string, endDate: string) {
    const response = await fetch(
      `/api/roster/availability?startDate=${startDate}&endDate=${endDate}`
    );
    if (!response.ok) throw new Error('Failed to fetch availability');
    return response.json();
  },

  async triggerRosterGeneration(roster: RosterDetails, availability: any) {
    const response = await fetch('/api/trigger/roster-generation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roster, availability }),
    });
    if (!response.ok) throw new Error('Failed to trigger roster generation task');
    return response.json();
  },
};

export default function CreateRosterForm() {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [rosters, setRosters] = useState<RosterDetails[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedRosterId, setSelectedRosterId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchRosters();
  }, []);

  const fetchRosters = useCallback(async () => {
    try {
      const data = await api.fetchRosters();
      setRosters(data);
      setError(null);
    } catch (err) {
      const error = err as ApiError;
      setError(error.message || 'Failed to fetch rosters');
    }
  }, []);

  const handleCreateRoster = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    try {
      await api.createRoster(dateRange);
      await fetchRosters();
      setShowForm(false);
      setDateRange(undefined);
      setError(null);
    } catch (err) {
      const error = err as ApiError;
      setError(error.message || 'Failed to create roster');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (roster: RosterDetails) => {
    setLoading(true);
    setSelectedRosterId(roster.id);
    setIsGenerating(true);
    setError(null);

    try {
      const availabilityData = await api.fetchAvailability(
        roster.startDate,
        roster.endDate
      );
      const { taskId } = await api.triggerRosterGeneration(roster, availabilityData);
      console.log('Generation task initiated:', taskId);
    } catch (err) {
      const error = err as ApiError;
      setError(error.message || 'Failed to process roster generation');
    } finally {
      setLoading(false);
    }
  };

  const renderRosterDetails = (roster: RosterDetails) => (
    <div key={roster.id} className="flex flex-col space-y-4">
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <p>Start: {format(new Date(roster.startDate), 'dd/MM/yyyy')}</p>
          <p>End: {format(new Date(roster.endDate), 'dd/MM/yyyy')}</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => handleViewDetails(roster)}
          disabled={loading && selectedRosterId === roster.id}
          className="flex items-center gap-2"
        >
          {loading && selectedRosterId === roster.id ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
              Generating
            </>
          ) : (
            'View Details'
          )}
        </Button>
      </div>
      
      {selectedRosterId === roster.id && isGenerating && (
        <div className="ml-4 p-4 border rounded-lg bg-gray-50">
          <p className="text-sm text-gray-600">
            The roster is being generated in the background. You don't need to stay on this page - 
            the roster will be automatically available in the roster section once complete. 
            Feel free to navigate away or close this page.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium mb-6">Create Roster</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Roster Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {error && (
              <div className="text-red-500 mb-4">
                {error}
              </div>
            )}
            
            {!showForm ? (
              <Button onClick={() => setShowForm(true)}>Create New Roster</Button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Date Range
                  </label>
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    className="rounded-md border"
                    numberOfMonths={2}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleCreateRoster} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Roster'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setDateRange(undefined);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {rosters.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Existing Rosters</h3>
                {rosters.map(renderRosterDetails)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}