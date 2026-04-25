import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { items, customerInfo } = payload as { items: unknown[], customerInfo: Record<string, unknown> };

    // In a production environment, this would integrate with Resend, SendGrid, or Nodemailer.
    // For now, we simulate the email being sent to the local print shop.
    console.log('\n=============================================');
    console.log('📧 AUTOMATED EMAIL TO LOCAL PRINT SHOP 📧');
    console.log('To: orders@local-tshirt-factory.com');
    console.log('Subject: New T-Shirt Order - AI Generation');
    console.log('---------------------------------------------');
    console.log(`Customer: ${customerInfo.name} (${customerInfo.email})`);
    console.log(`Shipping Address: ${customerInfo.address}, ${customerInfo.city} ${customerInfo.zip}`);
    console.log('\nItems to Print:');
    
    items.forEach((item: unknown, index: number) => {
      const it = item as { title?: string; size?: string; quantity?: number; imageUrl?: string; metadata?: { prompt?: string } };
      console.log(`\n--- Item #${index + 1} ---`);
      console.log(`Title: ${it.title}`);
      console.log(`Size: ${it.size || 'L (Default)'}`);
      console.log(`Quantity: ${it.quantity}`);
      console.log(`Image URL: ${it.imageUrl}`);
      if (it.metadata?.prompt) {
        console.log(`AI Prompt used: "${it.metadata.prompt}"`);
      }
    });
    console.log('=============================================\n');

    return NextResponse.json({ 
      success: true, 
      message: 'Email successfully sent to the print shop.' 
    });

  } catch (error: unknown) {
    console.error('Error sending email to print shop:', error);
    return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
  }
}
