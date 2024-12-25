'use client'

import { useState } from 'react';
import { RosterTable } from './roster-table';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Roster {
  id: number;
  startDate: string;
  endDate: string;
  teamId: number;
}

interface ShiftEntry {
  id: number;
  rosterId: number;
  userName: string;
  shiftType: string;
  date: string;
  startTime: string;
  finishTime: string;
  hours: number;
}

interface RosterViewProps {
  rosters: Roster[];
  shifts: ShiftEntry[];
}

export function RosterView({ rosters, shifts: initialShifts }: RosterViewProps) {
  const [currentRosterId, setCurrentRosterId] = useState(rosters[0]?.id?.toString());
  const [shifts, setShifts] = useState(initialShifts);

  const handleRosterChange = async (rosterId: string) => {
    setCurrentRosterId(rosterId);
    
    try {
      // Fetch new shifts for the selected roster
      const response = await fetch(`/api/roster/shifts_by_team?rosterId=${rosterId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch shifts');
      }
      
      const data = await response.json();
      setShifts(data.shifts || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      // You might want to show an error message to the user here
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={currentRosterId} onValueChange={handleRosterChange}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select a roster" />
            </SelectTrigger>
            <SelectContent>
              {rosters.map((roster: Roster) => (
                <SelectItem key={roster.id} value={roster.id.toString()}>
                  {new Date(roster.startDate).toLocaleDateString()} - {new Date(roster.endDate).toLocaleDateString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <RosterTable data={shifts} />
    </div>
  );
}