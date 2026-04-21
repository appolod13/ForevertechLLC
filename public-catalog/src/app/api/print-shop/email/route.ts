import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { items, customerInfo } = await request.json();

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
    
    items.forEach((item: any, index: number) => {
      console.log(`\n--- Item #${index + 1} ---`);
      console.log(`Title: ${item.title}`);
      console.log(`Size: ${item.size || 'L (Default)'}`);
      console.log(`Quantity: ${item.quantity}`);
      console.log(`Image URL: ${item.imageUrl}`);
      if (item.metadata?.prompt) {
        console.log(`AI Prompt used: "${item.metadata.prompt}"`);
      }
    });
    console.log('=============================================\n');

    return NextResponse.json({ 
      success: true, 
      message: 'Email successfully sent to the print shop.' 
    });

  } catch (error) {
    console.error('Error sending email to print shop:', error);
    return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
  }
}
