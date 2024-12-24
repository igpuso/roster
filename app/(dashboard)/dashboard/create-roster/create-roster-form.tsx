'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

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

export default function CreateRosterClient() {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [rosters, setRosters] = useState<RosterDetails[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedRosterId, setSelectedRosterId] = useState<number | null>(null);
  const [viewData, setViewData] = useState<ViewData | null>(null);
  const [generatedRoster, setGeneratedRoster] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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
    if (!dateRange?.from || !dateRange?.to) {
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
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Failed to create roster');
      
      await fetchRosters();
      setShowForm(false);
      setDateRange(undefined);
    } catch (error) {
      console.error('Error creating roster:', error);
      setError('Failed to create roster');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (roster: RosterDetails) => {
    setLoading(true);
    setSelectedRosterId(roster.id);
    setIsGenerating(true);
  
    try {
      // First, fetch availability data
      const availabilityResponse = await fetch(
        `/api/roster/availability?startDate=${roster.startDate}&endDate=${roster.endDate}`
      );
      if (!availabilityResponse.ok) throw new Error('Failed to fetch availability');
      
      const availabilityData = await availabilityResponse.json();
      setViewData({
        roster: roster,
        availability: availabilityData
      });
  
      // Log the data being sent to generate endpoint
      console.log('Sending to generate endpoint:', {
        roster: roster,
        availability: availabilityData
      });
  
      // Then, generate roster using the API endpoint
      const generateResponse = await fetch('/api/roster/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roster: roster,
          availability: availabilityData
        }),
      });
  
      if (!generateResponse.ok) {
        const errorText = await generateResponse.text();
        console.error('Generate response error:', {
          status: generateResponse.status,
          statusText: generateResponse.statusText,
          body: errorText
        });
        throw new Error(`Failed to generate roster: ${generateResponse.status}`);
      }
      
      const generatedData = await generateResponse.json();
      setGeneratedRoster(generatedData);
          // Add this new section to save the generated shifts
      if (Array.isArray(generatedData)) {
      // Save the generated shifts to the database
      const saveResponse = await fetch('/api/roster/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generatedData)
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save shifts');
      }

      const saveResult = await saveResponse.json();
      console.log('Shifts saved:', saveResult);
    }

  } catch (error) {
    console.error('Detailed error:', error);
    setError('Failed to fetch or generate data');
  } finally {
    setLoading(false);
    setIsGenerating(false);
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
                <div>
                  <label className="block mb-2">Select Date Range</label>
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    className="rounded-md border"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCreateRoster}
                    disabled={loading || !dateRange?.from || !dateRange?.to}
                  >
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
                          onClick={() => handleViewDetails(roster)}
                          disabled={loading}
                        >
                          {loading && selectedRosterId === roster.id 
                            ? 'Loading...' 
                            : 'View Details'}
                        </Button>
                      </div>
                      
                      {selectedRosterId === roster.id && viewData && (
                        <div className="ml-4 p-4 border rounded-lg bg-gray-50">
                          <div className="mb-4">
                            <h4 className="font-medium mb-2">Roster Details:</h4>
                            <pre className="whitespace-pre-wrap overflow-x-auto">
                              {JSON.stringify(viewData.roster, null, 2)}
                            </pre>
                          </div>
                          <div className="mb-4">
                            <h4 className="font-medium mb-2">Availability Data:</h4>
                            <pre className="whitespace-pre-wrap overflow-x-auto">
                              {JSON.stringify(viewData.availability, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Generated Roster:</h4>
                            {isGenerating ? (
                              <div className="text-center py-4">Generating roster...</div>
                            ) : generatedRoster ? (
                              <pre className="whitespace-pre-wrap overflow-x-auto">
                                {JSON.stringify(generatedRoster, null, 2)}
                              </pre>
                            ) : null}
                          </div>
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