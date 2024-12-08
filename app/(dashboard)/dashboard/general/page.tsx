'use client';

import { startTransition, useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/lib/auth';
import { updateAccount } from '@/app/(login)/actions';
import React, { useState, useEffect } from 'react';

type ActionState = {
  error?: string;
  success?: string;
};

export default function GeneralPage() {
  const { user } = useUser();
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateAccount,
    { error: '', success: '' }
  );

  const [birthDate, setBirthDate] = useState('');

  useEffect(() => {
    if (user?.birthDate) {
      const date = new Date(user.birthDate);
      const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(
        date.getMonth() + 1
      )
        .toString()
        .padStart(2, '0')}/${date.getFullYear()}`;
      setBirthDate(formattedDate);
      console.log('Preloaded Birth Date:', formattedDate); // Log preloaded value
    }
  }, [user?.birthDate]);

  const handleBirthDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let value = event.target.value;

    // Allow only numbers and "/"
    value = value.replace(/[^0-9/]/g, '');

    // Automatically add "/" at correct positions
    if (value.length === 2 || value.length === 5) {
      if (!value.endsWith('/')) {
        value += '/';
      }
    }

    // Restrict to DD/MM/YYYY format
    if (value.length > 10) {
      value = value.slice(0, 10);
    }

    setBirthDate(value);
    console.log('Updated Birth Date Input:', value); // Log each input change
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
  
    // If birthDate is empty, remove it from formData
    if (!birthDate) {
      formData.delete('birthDate');
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(birthDate)) {
      formData.set('birthDate', birthDate); // Keep DD/MM/YYYY format
      console.log('Final Birth Date (DD/MM/YYYY):', birthDate);
    } else {
      console.error('Invalid Birth Date Format:', birthDate);
      return; // Prevent submission for invalid formats
    }
  
    console.log('Final Form Data Submitted:', Object.fromEntries(formData));
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        General Settings
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter your name"
                defaultValue={user?.name || ''}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                defaultValue={user?.email || ''}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="Enter your phone number"
                defaultValue={user?.phone || ''}
              />
            </div>
            <div>
              <Label htmlFor="birthDate">Birth Date</Label>
              <Input
                id="birthDate"
                name="birthDate"
                placeholder="DD/MM/YYYY"
                value={birthDate}
                onChange={handleBirthDateChange}
                maxLength={10}
              />
            </div>
            {state.error && (
              <p className="text-red-500 text-sm">{state.error}</p>
            )}
            {state.success && (
              <p className="text-green-500 text-sm">{state.success}</p>
            )}
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
