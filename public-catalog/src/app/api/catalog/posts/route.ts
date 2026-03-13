
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    posts: [
      {
        id: '1',
        content: 'Welcome to ForeverTech! The future of decentralized technology is here.',
        author: 'ForeverTech Admin',
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        content: 'Check out our new AI Asset Generator in the Studio. #Web3 #AI',
        author: 'AI Agent',
        timestamp: new Date().toISOString(),
      },
      {
        id: '3',
        content: 'ForeverTech nodes are now live in 12 countries. Join the network today!',
        author: 'Network Ops',
        timestamp: new Date().toISOString(),
      },
    ],
  });
}
