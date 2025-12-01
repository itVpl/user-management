# Receipt Voucher Module

## Overview
The Receipt Voucher module is a comprehensive React component for managing receipt vouchers in the Tally accounting system. It follows the same design patterns and theme as the Payment Voucher module.

## Features

### Core Functionality
- ✅ Create new receipt vouchers
- ✅ Edit existing receipt vouchers
- ✅ View receipt voucher details
- ✅ Delete receipt vouchers (soft delete)
- ✅ Post/Unpost vouchers
- ✅ Filter receipts by date range and status
- ✅ Search functionality
- ✅ Company selection

### Receipt Details
- Multiple receipt modes: Cash, Bank, Cheque, NEFT, RTGS, UPI, Credit Card, Debit Card, Other
- Cheque details (number and date) when applicable
- Reference number tracking
- Auto-generated voucher numbers (RECEIPT/YYYY-YY/NNNNN format)

### Entry Management
- Multiple entries per voucher
- Account selection with searchable dropdown
- Bill-wise tracking (Against Ref, New Ref, Advance, On Account)
- TDS calculation and tracking
- GST details support
- Entry-level narration

### Calculations
- Auto-calculation of TDS amount based on rate
- Auto-calculation of GST amount based on rate
- Auto-calculation of total amount from all entries
- Real-time updates when amounts change

## API Integration

The component integrates with the following API endpoints:

- `GET /api/v1/tally/voucher/receipt/all` - Fetch all receipts
- `GET /api/v1/tally/voucher/receipt/:id` - Get receipt by ID
- `POST /api/v1/tally/voucher/receipt/create` - Create new receipt
- `PUT /api/v1/tally/voucher/receipt/:id/update` - Update receipt
- `DELETE /api/v1/tally/voucher/receipt/:id/delete` - Delete receipt
- `PUT /api/v1/tally/voucher/receipt/:id/post` - Post receipt
- `PUT /api/v1/tally/voucher/receipt/:id/unpost` - Unpost receipt

## Usage

```jsx
import ReceiptVoucher from './Components/Finance/ReceiptVoucher';

function App() {
  return <ReceiptVoucher />;
}
```

## Component Structure

### Main Sections
1. **Header** - Company selector, search, filter, and create button
2. **Data Table** - List of all receipt vouchers with actions
3. **Create/Edit Modal** - Form for creating or editing receipts
4. **View Modal** - Detailed view of receipt voucher
5. **Filter Modal** - Date range and status filters

### Form Sections
1. **Company Information** - Select company
2. **Voucher Information** - Voucher number and date
3. **Receipt Details** - Receipt account, mode, reference, cheque details
4. **Receipt Entries** - Multiple entries with account, amount, TDS, GST
5. **Additional Information** - Overall narration, total amount, remarks

## Design Theme

The component follows the project's design theme with:
- Gradient backgrounds (blue-500 to blue-600)
- Rounded corners (rounded-lg, rounded-2xl, rounded-3xl)
- Shadow effects (shadow-lg, shadow-xl, shadow-2xl)
- Color-coded sections (orange, purple, blue, green backgrounds)
- Responsive layout
- Smooth transitions and hover effects

## Validation

### Required Fields
- Company
- Voucher Date
- Receipt Account
- Receipt Mode
- At least one entry with:
  - Account
  - Amount (must be > 0)

### Business Rules
- Posted vouchers cannot be deleted
- Posted vouchers have restrictions on updates
- Total amount must match sum of entry amounts
- TDS and GST amounts are auto-calculated
- Voucher numbers are auto-generated if not provided

## State Management

The component uses React hooks for state management:
- `useState` for form data, filters, modals, loading states
- `useEffect` for data fetching, auto-calculations, company/ledger loading
- `useCallback` for optimized data fetching

## Dependencies

- React
- Axios (for API calls)
- Lucide React (for icons)
- Alertify.js (for notifications)
- Tailwind CSS (for styling)

## Notes

- The component uses the same SearchableDropdown component as Payment Voucher
- Financial year calculation follows Indian standards (April to March)
- All amounts are formatted in Indian currency format (₹)
- Dates are displayed in local format
- The component handles nested object responses from the API
