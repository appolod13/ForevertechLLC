
# Purchase Functionality & Test Environment Documentation

## Overview
This update enables fully interactive purchasing functionality for the public catalog. Users can now click "Buy with FC" or "Buy Crypto" to initiate a purchase sequence, which integrates with the backend cart system.

## Enhancements

### 1. Interactive Purchase Buttons (`CatalogItem.tsx`)
- **Event Handling**: Added `onClick` handlers to both purchase buttons.
- **State Management**: Introduced `isPurchasing` state to show loading indicators during the transaction.
- **API Integration**: Calls `POST /api/cart/add` to sync the purchase with the backend.
- **Visual Feedback**:
  - Buttons show a spinner when processing.
  - Success alerts confirm the action.
  - Buttons are disabled during processing to prevent double-billing.

### 2. Testing Environment
The system is configured for end-to-end testing:
- **Backend**: `mirror_site` acts as the transaction processor.
- **Data Persistence**: `cart.json` logs all added items with timestamps.
- **Currency Support**: Handles both 'USD' and 'FC' (ForeverCoin) transaction types.

## Verification Steps

### Manual Test (User Journey)
1. Navigate to the **Home Page** or **Latest Drops**.
2. Find an item (e.g., "Future City").
3. Click **"Buy w/ FC"**.
4. **Observe**:
   - Button text changes to a spinner.
   - Console logs: `Initiating FC purchase for item...`
   - Success alert: `Successfully added to cart! (FC)`
   - Console logs: `Purchase successful: { ... }`
5. **Verify**: Check `cart.json` in the backend (or via `WorkflowTestPage`) to confirm the item was added.

### Automated Test
Run the `WorkflowTestPage` (`/workflow-test`) which now implicitly tests this logic via the "Cart Integration" phase.

## Debugging
- **Console Logs**: Detailed logs are emitted for `Initiating purchase` and `Purchase successful`.
- **Error Handling**: Network errors or backend failures trigger a `Failed to process purchase` alert and error log.
