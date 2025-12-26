import React from 'react';

const NegotiationTestButton = () => {
  const testNegotiationNotification = () => {
    // Simulate a negotiation message event
    const testData = {
      bidId: 'test-bid-123',
      loadId: 'test-load-456',
      rate: 1500,
      message: 'Can we negotiate this rate? This is a test message.',
      senderName: 'Test Shipper',
      timestamp: new Date().toISOString(),
      sender: 'shipper',
      isShipper: true
    };

    console.log('🧪 Dispatching test negotiation event:', testData);

    // Dispatch the event that our notification system listens for
    window.dispatchEvent(new CustomEvent('NEGOTIATION_MESSAGE_RECEIVED', {
      detail: testData
    }));
  };

  return (
    <div className="fixed top-4 left-4 z-50">
      <button
        onClick={testNegotiationNotification}
      >
       
      </button>
    </div>
  );
};

export default NegotiationTestButton;