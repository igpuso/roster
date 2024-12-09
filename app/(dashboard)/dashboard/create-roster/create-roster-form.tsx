'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect } from "react";
import { format } from "date-fns";

export default function CreateRosterClient() {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [rosters, setRosters] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedRosterId, setSelectedRosterId] = useState<number | null>(null);
  const [availabilityData, setAvailabilityData] = useState<any>(null);

  // Fetch existing rosters on mount
  useEffect(() => {
    fetchRosters();
  }, []);

  const fetchRosters = async () => {
    try {
      const response = await fetch('/api/roster/list');
      if (!response.ok) throw new Error('Failed to fetch rosters');
      const data = await response.json();
      setRosters(data);
    } catch (error) {
      console.error('Error fetching rosters:', error);
      setError('Failed to fetch rosters');
    }
  };

  const handleCreateRoster = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/roster/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Failed to create roster');
      
      await fetchRosters(); // Refresh the roster list
      setShowForm(false);
      setStartDate(undefined);
      setEndDate(undefined);
    } catch (error) {
      console.error('Error creating roster:', error);
      setError('Failed to create roster');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (rosterId: number) => {
    setLoading(true);
    setSelectedRosterId(rosterId);
    
    try {
      const response = await fetch('/api/roster/availability');
      if (!response.ok) throw new Error('Failed to fetch availability');
      
      const data = await response.json();
      setAvailabilityData(data);
    } catch (error) {
      console.error('Error fetching availability:', error);
      setError('Failed to fetch availability data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium mb-6">Create Roster</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Roster Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={() => setShowForm(true)}
              disabled={loading}
              variant="outline"
            >
              Create New Roster
            </Button>

            {error && (
              <div className="text-red-500 text-sm mt-2">
                {error}
              </div>
            )}

            {showForm && (
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block mb-2">Start Date</label>
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      className="rounded-md border"
                    />
                  </div>
                  <div>
                    <label className="block mb-2">End Date</label>
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      className="rounded-md border"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCreateRoster}
                    disabled={loading || !startDate || !endDate}
                  >
                    {loading ? 'Creating...' : 'Create Roster'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setStartDate(undefined);
                      setEndDate(undefined);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {rosters.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Existing Rosters</h3>
                <div className="space-y-4">
                  {rosters.map((roster) => (
                    <div key={roster.id} className="flex flex-col space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p>Start: {format(new Date(roster.startDate), 'dd/MM/yyyy')}</p>
                          <p>End: {format(new Date(roster.endDate), 'dd/MM/yyyy')}</p>
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() => handleViewDetails(roster.id)}
                          disabled={loading}
                        >
                          {loading && selectedRosterId === roster.id 
                            ? 'Loading...' 
                            : 'View Details'}
                        </Button>
                      </div>
                      
                      {selectedRosterId === roster.id && availabilityData && (
                        <div className="ml-4 p-4 border rounded-lg bg-gray-50">
                          <pre className="whitespace-pre-wrap overflow-x-auto">
                            {JSON.stringify(availabilityData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}