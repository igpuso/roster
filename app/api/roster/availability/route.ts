import { getUsersWithAvailability } from '@/lib/db/queries';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const data = await getUsersWithAvailability();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error server' }, { status: 500 });
  }
}