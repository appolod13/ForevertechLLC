
'use client';

import { useState } from 'react';
import { Header } from '../../components/Header';
import { Play, CheckCircle, AlertCircle, Phone, ShoppingCart, Truck, CreditCard } from 'lucide-react';

export default function WorkflowTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [testData, setTestData] = useState<any>({});

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${msg}`, ...prev]);
  };

  const runTest = async () => {
    setIsRunning(true);
    setLogs([]);
    setCurrentStep(1);
    setTestData({});

    try {
      // 1. Purchase Phase
      addLog('--- PHASE 1: PURCHASE ---');
      addLog('Initiating purchase for Account #ACC-101...');
      
      const purchaseRes = await fetch('http://localhost:3001/api/accounts/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: 'ACC-101', name: 'Premium Account' })
      });
      
      if (!purchaseRes.ok) throw new Error('Purchase failed');
      const purchaseData = await purchaseRes.json();
      setTestData((prev: any) => ({ ...prev, order: purchaseData.order }));
      addLog(`Purchase Successful! Order ID: ${purchaseData.order.id}`);
      addLog(`Status Verified: ${purchaseData.order.status}`);
      
      await new Promise(r => setTimeout(r, 1000));
      setCurrentStep(2);

      // 2. Data Entry Phase
      addLog('--- PHASE 2: DATA ENTRY ---');
      const mockShipping = {
        address: '123 Tech Blvd, Silicon Valley, CA',
        phone: '+15550123456',
        email: 'test.user@example.com'
      };
      addLog(`Entering shipping details for ${mockShipping.email}...`);
      
      const shippingRes = await fetch('http://localhost:3001/api/shipping/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: purchaseData.order.id, shipping: mockShipping })
      });
      
      if (!shippingRes.ok) throw new Error('Shipping update failed');
      const shippingData = await shippingRes.json();
      addLog('Shipping details saved successfully.');
      
      await new Promise(r => setTimeout(r, 1000));
      setCurrentStep(3);

      // 3. Cart Integration
      addLog('--- PHASE 3: CART INTEGRATION ---');
      addLog('Adding purchased account to cart for processing...');
      
      const cartRes = await fetch('http://localhost:3001/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: { id: purchaseData.order.accountId, name: purchaseData.order.name, price: 49.99 } })
      });
      
      if (!cartRes.ok) throw new Error('Cart add failed');
      const cartData = await cartRes.json();
      addLog(`Cart Updated. Total Items: ${cartData.cart.items.length}`);
      
      await new Promise(r => setTimeout(r, 1000));
      setCurrentStep(4);

      // 4. Call Bot Activation
      addLog('--- PHASE 4: CALL BOT ACTIVATION ---');
      addLog('Triggering AI Voice Agent...');
      
      const callRes = await fetch('http://localhost:3001/api/support/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: mockShipping.phone, reason: 'Post-Purchase Verification' })
      });
      
      if (!callRes.ok) throw new Error('Call trigger failed');
      const callData = await callRes.json();
      addLog(`Call Initiated! Call ID: ${callData.callId}`);
      addLog(`Call Status: ${callData.status}`);
      
      setCurrentStep(5);
      addLog('--- TEST COMPLETE: SUCCESS ---');

    } catch (e: any) {
      addLog(`[ERROR] ${e.message}`);
      console.error(e);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="max-w-4xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Purchase-to-Call Workflow Test</h1>
            <p className="text-gray-400">Live verification of the end-to-end sales and support cycle.</p>
          </div>
          <button 
            onClick={runTest}
            disabled={isRunning}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
              isRunning ? 'bg-gray-700 cursor-wait' : 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-900/20'
            }`}
          >
            {isRunning ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <Play className="w-5 h-5" />}
            {isRunning ? 'Running Test...' : 'Start Live Test'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Status Steps */}
          <div className="space-y-4">
            <StepCard 
              step={1} 
              current={currentStep} 
              title="Purchase Account" 
              icon={<CreditCard className="w-5 h-5" />} 
              desc="Simulate buying Account #ACC-101"
            />
            <StepCard 
              step={2} 
              current={currentStep} 
              title="Data Entry" 
              icon={<Truck className="w-5 h-5" />} 
              desc="Input shipping & contact info"
            />
            <StepCard 
              step={3} 
              current={currentStep} 
              title="Cart Integration" 
              icon={<ShoppingCart className="w-5 h-5" />} 
              desc="Sync order to shopping cart"
            />
            <StepCard 
              step={4} 
              current={currentStep} 
              title="Call Activation" 
              icon={<Phone className="w-5 h-5" />} 
              desc="Trigger AI verification call"
            />
            <StepCard 
              step={5} 
              current={currentStep} 
              title="Verification" 
              icon={<CheckCircle className="w-5 h-5" />} 
              desc="Confirm data persistence"
            />
          </div>

          {/* Logs Console */}
          <div className="lg:col-span-2 bg-black rounded-xl border border-gray-800 p-4 font-mono text-sm h-[500px] overflow-y-auto shadow-inner">
            {logs.length === 0 && (
              <div className="text-gray-600 text-center mt-20">
                Click "Start Live Test" to begin...
              </div>
            )}
            {logs.map((log, i) => (
              <div key={i} className={`mb-2 ${log.includes('ERROR') ? 'text-red-400' : log.includes('PHASE') ? 'text-blue-400 font-bold mt-4' : 'text-green-300'}`}>
                {log}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function StepCard({ step, current, title, icon, desc }: any) {
  const status = current > step ? 'completed' : current === step ? 'active' : 'pending';
  
  return (
    <div className={`p-4 rounded-lg border transition-all ${
      status === 'active' ? 'bg-gray-800 border-blue-500 shadow-blue-900/20 shadow-md' : 
      status === 'completed' ? 'bg-gray-800/50 border-green-900 opacity-70' : 
      'bg-gray-900 border-gray-800 opacity-50'
    }`}>
      <div className="flex items-center gap-3 mb-1">
        <div className={`p-2 rounded-full ${
          status === 'active' ? 'bg-blue-900 text-blue-200' : 
          status === 'completed' ? 'bg-green-900 text-green-200' : 
          'bg-gray-800 text-gray-500'
        }`}>
          {status === 'completed' ? <CheckCircle className="w-4 h-4" /> : icon}
        </div>
        <h3 className={`font-bold ${status === 'active' ? 'text-white' : 'text-gray-400'}`}>{title}</h3>
      </div>
      <p className="text-xs text-gray-500 ml-11">{desc}</p>
    </div>
  );
}
