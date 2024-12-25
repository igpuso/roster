'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ShiftEntry {
    id: number;
    rosterId: number;
    userName: string; // We handle null values before passing to component
    shiftType: string;
    date: string;
    startTime: string;
    finishTime: string;
    hours: number;
  }

interface RosterTableProps {
  data: ShiftEntry[]
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

const formatTime = (time: string) => {
  return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

const getShiftColor = (shiftType: string) => {
  switch (shiftType.toUpperCase()) {
    case 'AM':
      return 'bg-blue-100';
    case 'PM':
      return 'bg-green-100';
    case 'NA':
      return 'bg-purple-100';
    default:
      return 'bg-gray-100';
  }
}

export function RosterTable({ data }: RosterTableProps) {
  // Get unique dates from the data
  const dates = [...new Set(data.map(entry => entry.date))].sort();
  
  // Get unique users
  const users = [...new Set(data.map(entry => entry.userName))].sort();

  // Format the data for easier lookup
  const rosterByDateAndUser = data.reduce((acc, entry) => {
    const key = `${entry.date}-${entry.userName}`;
    acc[key] = entry;
    return acc;
  }, {} as Record<string, ShiftEntry>);

  return (
    <Card className="w-full overflow-auto">
      <CardHeader>
        <CardTitle>Front Office Roster</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px] bg-gray-100">Employee Name</TableHead>
              {dates.map(date => (
                <TableHead key={date} className="min-w-[120px] text-center">
                  <div>{formatDate(date)}</div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(userName => (
              <TableRow key={userName}>
                <TableCell className="font-medium bg-gray-50">
                  {userName}
                </TableCell>
                {dates.map(date => {
                  const entry = rosterByDateAndUser[`${date}-${userName}`];
                  return (
                    <TableCell key={date} className="p-0">
                      {entry && (
                        <div className={`p-2 ${getShiftColor(entry.shiftType)}`}>
                          <div className="text-xs font-medium">{entry.shiftType}</div>
                          <div className="text-xs">
                            {formatTime(entry.startTime)} - {formatTime(entry.finishTime)}
                          </div>
                        </div>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}