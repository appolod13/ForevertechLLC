export type CustomerProfile = {
  name: string;
  email: string;
  phone: string;
  qrUrl?: string;
  address: string;
  address2?: string;
  city: string;
  region: string;
  country: string;
  zip: string;
  walletAddress: string;
};

export const customerProfiles: CustomerProfile[] = [
  {
    name: 'Avery Johnson',
    email: 'avery.johnson@example.com',
    phone: '+15550100001',
    qrUrl: 'https://forevertech.ai/verify/avery',
    address: '123 Tech Blvd',
    address2: 'Apt 4B',
    city: 'San Francisco',
    region: 'CA',
    country: 'US',
    zip: '94107',
    walletAddress: '0x1111111111111111111111111111111111111111',
  },
  {
    name: 'Priya Nair',
    email: 'priya.nair@example.com',
    phone: '+442071234567',
    qrUrl: 'https://forevertech.ai/verify/priya',
    address: '12 Quantum Street',
    address2: '',
    city: 'London',
    region: 'London',
    country: 'GB',
    zip: 'EC1A 1BB',
    walletAddress: '0x2222222222222222222222222222222222222222',
  },
  {
    name: 'Kenji Sato',
    email: 'kenji.sato@example.com',
    phone: '+81312345678',
    qrUrl: 'https://forevertech.ai/verify/kenji',
    address: '1-2-3 Shibuya',
    address2: '',
    city: 'Tokyo',
    region: 'Tokyo',
    country: 'JP',
    zip: '150-0002',
    walletAddress: '0x3333333333333333333333333333333333333333',
  },
];

