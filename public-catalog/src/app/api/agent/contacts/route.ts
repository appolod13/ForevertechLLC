import { NextResponse } from 'next/server';

const contacts = [
  { id: '1', name: 'Internal Support Team', phone: '+18005551234' }
];

export async function GET() {
  return NextResponse.json({ success: true, contacts });
}

export async function POST(request: Request) {
  try {
    const { name, phone } = await request.json();
    if (!name || !phone) {
      return NextResponse.json({ success: false, error: 'Name and phone required' }, { status: 400 });
    }
    
    // Check if already exists
    const exists = contacts.find(c => c.phone === phone);
    if (!exists) {
      const newContact = {
        id: Date.now().toString(),
        name,
        phone
      };
      contacts.push(newContact);
    }

    return NextResponse.json({ success: true, contacts });
  } catch (error) {
    console.error('Error saving contact:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
