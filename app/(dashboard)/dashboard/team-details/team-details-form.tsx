// app/(dashboard)/dashboard/team/team-details-form.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateTeamMemberDetails } from '@/app/(login)/actions';
import { useActionState } from 'react';
import { useState } from 'react';

type State = {
  message: string;
  type: 'error' | 'success' | undefined;
};

type TeamMember = {
  user: {
    id: number;
    name: string | null;
    email: string;
    position: string | null;
    hourlyRate: number | null;
    maxWeeklyHours: number | null;
    minWeeklyHours: number | null;
    seniority: number | null;
  };
};

type TeamDetailsFormProps = {
  teamData: {
    teamMembers: TeamMember[];
  };
};

export function TeamDetailsForm({ teamData }: TeamDetailsFormProps) {
  const [selectedMember, setSelectedMember] = useState<TeamMember['user'] | null>(null);
  
  const initialState: State = {
    message: '',
    type: undefined
  };

  const formAction = async (prevState: State, formData: FormData) => {
    try {
      const result = await updateTeamMemberDetails(prevState, formData);
      if ('error' in result) {
        return { message: result.error, type: 'error' } as State;
      }
      return { message: result.success, type: 'success' } as State;
    } catch (error) {
      return { 
        message: error instanceof Error ? error.message : 'An error occurred', 
        type: 'error' 
      } as State;
    }
  };

  const [state, dispatch] = useActionState<State, FormData>(formAction, initialState);

  const handleMemberSelect = (memberId: string) => {
    const member = teamData.teamMembers.find(m => m.user.id === parseInt(memberId));
    setSelectedMember(member?.user || null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-medium">Team Member Details</h1>
      
      {/* Team Member Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Team Member</CardTitle>
        </CardHeader>
        <CardContent>
          <Select onValueChange={handleMemberSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Select a team member" />
            </SelectTrigger>
            <SelectContent>
              {teamData.teamMembers.map((member) => (
                <SelectItem 
                  key={member.user.id} 
                  value={member.user.id.toString()}
                >
                  {member.user.name || member.user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedMember && (
        <Card>
          <CardHeader>
            <CardTitle>Update Team Member Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={dispatch} className="space-y-4">
              <input type="hidden" name="userId" value={selectedMember.id} />

              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input 
                  id="position" 
                  name="position" 
                  placeholder="e.g., Front Desk, Kitchen"
                  defaultValue={selectedMember.position || ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate</Label>
                <Input 
                    id="hourlyRate" 
                    name="hourlyRate" 
                    type="number" 
                    step="0.01"
                    min="0"
                    defaultValue={selectedMember.hourlyRate || ''}
                />
                </div>

              <div className="space-y-2">
                <Label htmlFor="maxWeeklyHours">Maximum Weekly Hours</Label>
                <Input 
                  id="maxWeeklyHours" 
                  name="maxWeeklyHours" 
                  type="number" 
                  min="0"
                  defaultValue={selectedMember.maxWeeklyHours || ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minWeeklyHours">Minimum Weekly Hours</Label>
                <Input 
                  id="minWeeklyHours" 
                  name="minWeeklyHours" 
                  type="number" 
                  min="0"
                  defaultValue={selectedMember.minWeeklyHours || ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seniority">Seniority Level</Label>
                <Input 
                  id="seniority" 
                  name="seniority" 
                  type="number" 
                  min="0"
                  defaultValue={selectedMember.seniority || ''}
                />
              </div>

              <Button type="submit">
                Update Details
              </Button>

              {state.message && (
                <p className={`text-sm mt-2 ${
                  state.type === 'error' ? 'text-red-500' : 'text-green-500'
                }`}>
                  {state.message}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}