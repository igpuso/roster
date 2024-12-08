'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

export default function CreateRosterClient() {
  const [loading, setLoading] = useState(false);
  const [usersData, setUsersData] = useState<any[]>([]);

  const handleFetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/roster/availability', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const data = await response.json();
      setUsersData(data);
      console.log('Users with availability:', data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium mb-6">Create Roster</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>User Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div className="mb-4 sm:mb-0">
              </div>
              <Button 
                onClick={handleFetchData}
                disabled={loading}
                variant="outline"
              >
                {loading ? 'Loading...' : 'Generate Roster'}
              </Button>
            </div>

            {usersData.length > 0 && (
              <div className="mt-4 border rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-medium mb-2">Available Users</h3>
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(usersData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}