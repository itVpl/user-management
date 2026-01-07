# DO Excel Template Headers - Complete Documentation

## Overview
This document lists all **82 column headers** that appear in the DO Excel template file downloaded from the frontend. The template uses **flat fields** (no JSON required) making it easy for employees to fill out without technical knowledge.

---

## Complete Header List (82 Columns)

### Column A-H: Basic Information (8 columns)

| Column | Header Name | Type | Required | Description | Dropdown Options |
|--------|-------------|------|----------|-------------|------------------|
| **A** | Employee ID | Text | ✅ Yes | Employee identifier | None |
| **B** | Date | Date | ❌ No | Order date (format: YYYY-MM-DD) | None |
| **C** | Load Type | Text | ✅ Yes | Type of load | **OTR, DRAYAGE** |
| **D** | Shipper Name | Text | ❌ No | Name of the shipper company | None |
| **E** | Shipper ID | Text | ❌ No | Shipper identifier | None |
| **F** | Carrier Name | Text | ❌ No | Name of the carrier company | None |
| **G** | Carrier ID | Text | ❌ No | Carrier identifier | None |
| **H** | Equipment Type | Text | ❌ No | Type of equipment/trailer | **See Equipment Options Below** |

**Equipment Type Dropdown Options:**
- **For OTR**: Dry Van, Reefer, Step Deck, Double Drop / Lowboy, Conestoga, Livestock Trailer, Car Hauler, Container Chassis, End Dump, Side Dump, Hopper Bottom
- **For DRAYAGE**: 20' Standard, 40' Standard, 45' Standard, 20' Reefer, 40' Reefer, Open Top Container, Flat Rack Container, Tank Container, 40' High Cube, 45' High Cube

---

### Column I-O: Customer Information (7 columns)

| Column | Header Name | Type | Required | Description |
|--------|-------------|------|----------|-------------|
| **I** | Load No | Text | ❌ No | Load number identifier |
| **J** | Bill To | Text | ❌ No | Company to bill |
| **K** | Dispatcher Name | Text | ❌ No | Name of dispatcher |
| **L** | Work Order No | Text | ❌ No | Work order number |
| **M** | Line Haul | Number | ❌ No | Line haul amount |
| **N** | FSC (%) | Number | ❌ No | Fuel surcharge percentage |
| **O** | Total Amount | Number | ❌ No | Total amount (auto-calculated if empty) |

---

### Column P-X: Other Items (9 columns - supports up to 3 items)

| Column | Header Name | Type | Required | Description |
|--------|-------------|------|----------|-------------|
| **P** | Other Item 1 Name | Text | ❌ No | Name of first other item |
| **Q** | Other Item 1 Quantity | Number | ❌ No | Quantity for first item |
| **R** | Other Item 1 Amount | Number | ❌ No | Amount for first item |
| **S** | Other Item 2 Name | Text | ❌ No | Name of second other item |
| **T** | Other Item 2 Quantity | Number | ❌ No | Quantity for second item |
| **U** | Other Item 2 Amount | Number | ❌ No | Amount for second item |
| **V** | Other Item 3 Name | Text | ❌ No | Name of third other item |
| **W** | Other Item 3 Quantity | Number | ❌ No | Quantity for third item |
| **X** | Other Item 3 Amount | Number | ❌ No | Amount for third item |

---

### Column Y-AG: Carrier Fees (9 columns - supports up to 3 fees)

| Column | Header Name | Type | Required | Description |
|--------|-------------|------|----------|-------------|
| **Y** | Carrier Fee 1 Name | Text | ❌ No | Name of first carrier fee |
| **Z** | Carrier Fee 1 Quantity | Number | ❌ No | Quantity for first fee |
| **AA** | Carrier Fee 1 Amount | Number | ❌ No | Amount for first fee |
| **AB** | Carrier Fee 2 Name | Text | ❌ No | Name of second carrier fee |
| **AC** | Carrier Fee 2 Quantity | Number | ❌ No | Quantity for second fee |
| **AD** | Carrier Fee 2 Amount | Number | ❌ No | Amount for second fee |
| **AE** | Carrier Fee 3 Name | Text | ❌ No | Name of third carrier fee |
| **AF** | Carrier Fee 3 Quantity | Number | ❌ No | Quantity for third fee |
| **AG** | Carrier Fee 3 Amount | Number | ❌ No | Amount for third fee |

---

### Column AH-AJ: BOL & Container/Shipment (4 columns)

| Column | Header Name | Type | Required | Description |
|--------|-------------|------|----------|-------------|
| **AH** | BOL Numbers (comma-separated) | Text | ❌ No | BOL numbers separated by commas (e.g., BOL001,BOL002) |
| **AI** | Container No | Text | ❌ No | Container number |
| **AJ** | Container Type | Text | ❌ No | Type of container |
| **AK** | Shipment No | Text | ❌ No | Shipment number |

---

### Column AL-AT: Pickup Location 1 (9 columns)

| Column | Header Name | Type | Required | Description |
|--------|-------------|------|----------|-------------|
| **AL** | Pickup 1 Name | Text | ❌ No | Name of first pickup location |
| **AM** | Pickup 1 Address | Text | ❌ No | Address of first pickup location |
| **AN** | Pickup 1 City | Text | ❌ No | City of first pickup location |
| **AO** | Pickup 1 State | Text | ❌ No | State of first pickup location |
| **AP** | Pickup 1 ZipCode | Text | ❌ No | ZIP code of first pickup location |
| **AQ** | Pickup 1 Weight | Number | ❌ No | Weight at first pickup location (lbs) |
| **AR** | Pickup 1 Commodity | Text | ❌ No | Commodity type at first pickup |
| **AS** | Pickup 1 Date | Date | ❌ No | Pickup date (format: YYYY-MM-DD) |
| **AT** | Pickup 1 Remarks | Text | ❌ No | Additional remarks for first pickup |

---

### Column AU-BC: Pickup Location 2 (9 columns)

| Column | Header Name | Type | Required | Description |
|--------|-------------|------|----------|-------------|
| **AU** | Pickup 2 Name | Text | ❌ No | Name of second pickup location |
| **AV** | Pickup 2 Address | Text | ❌ No | Address of second pickup location |
| **AW** | Pickup 2 City | Text | ❌ No | City of second pickup location |
| **AX** | Pickup 2 State | Text | ❌ No | State of second pickup location |
| **AY** | Pickup 2 ZipCode | Text | ❌ No | ZIP code of second pickup location |
| **AZ** | Pickup 2 Weight | Number | ❌ No | Weight at second pickup location (lbs) |
| **BA** | Pickup 2 Commodity | Text | ❌ No | Commodity type at second pickup |
| **BB** | Pickup 2 Date | Date | ❌ No | Pickup date (format: YYYY-MM-DD) |
| **BC** | Pickup 2 Remarks | Text | ❌ No | Additional remarks for second pickup |

---

### Column BD-BL: Drop Location 1 (9 columns)

| Column | Header Name | Type | Required | Description |
|--------|-------------|------|----------|-------------|
| **BD** | Drop 1 Name | Text | ❌ No | Name of first drop location |
| **BE** | Drop 1 Address | Text | ❌ No | Address of first drop location |
| **BF** | Drop 1 City | Text | ❌ No | City of first drop location |
| **BG** | Drop 1 State | Text | ❌ No | State of first drop location |
| **BH** | Drop 1 ZipCode | Text | ❌ No | ZIP code of first drop location |
| **BI** | Drop 1 Weight | Number | ❌ No | Weight at first drop location (lbs) |
| **BJ** | Drop 1 Commodity | Text | ❌ No | Commodity type at first drop |
| **BK** | Drop 1 Date | Date | ❌ No | Drop date (format: YYYY-MM-DD) |
| **BL** | Drop 1 Remarks | Text | ❌ No | Additional remarks for first drop |

---

### Column BM-BU: Drop Location 2 (9 columns)

| Column | Header Name | Type | Required | Description |
|--------|-------------|------|----------|-------------|
| **BM** | Drop 2 Name | Text | ❌ No | Name of second drop location |
| **BN** | Drop 2 Address | Text | ❌ No | Address of second drop location |
| **BO** | Drop 2 City | Text | ❌ No | City of second drop location |
| **BP** | Drop 2 State | Text | ❌ No | State of second drop location |
| **BQ** | Drop 2 ZipCode | Text | ❌ No | ZIP code of second drop location |
| **BR** | Drop 2 Weight | Number | ❌ No | Weight at second drop location (lbs) |
| **BS** | Drop 2 Commodity | Text | ❌ No | Commodity type at second drop |
| **BT** | Drop 2 Date | Date | ❌ No | Drop date (format: YYYY-MM-DD) |
| **BU** | Drop 2 Remarks | Text | ❌ No | Additional remarks for second drop |

---

### Column BV-CB: Return Location (7 columns - DRAYAGE only)

| Column | Header Name | Type | Required | Description |
|--------|-------------|------|----------|-------------|
| **BV** | Return Name | Text | ❌ No | Name of return location (DRAYAGE only) |
| **BW** | Return Address | Text | ❌ No | Address of return location |
| **BX** | Return City | Text | ❌ No | City of return location |
| **BY** | Return State | Text | ❌ No | State of return location |
| **BZ** | Return ZipCode | Text | ❌ No | ZIP code of return location |
| **CA** | Return Weight | Number | ❌ No | Weight at return location (lbs) |
| **CB** | Return Date | Date | ❌ No | Return date (format: YYYY-MM-DD) |

---

### Column CC-CD: Additional Fields (2 columns)

| Column | Header Name | Type | Required | Description |
|--------|-------------|------|----------|-------------|
| **CC** | Assigned Company | Text | ❌ No | Company assigned to the order |
| **CD** | Add Disbursement | Text | ❌ No | Additional disbursement information |

---

## Summary Statistics

- **Total Columns**: 82
- **Required Fields**: 2 (Employee ID, Load Type)
- **Optional Fields**: 80
- **Fields with Dropdowns**: 2 (Load Type, Equipment Type)
- **Date Fields**: 5 (Date, Pickup 1 Date, Pickup 2 Date, Drop 1 Date, Drop 2 Date, Return Date)
- **Number Fields**: 15+ (Line Haul, FSC, Total Amount, Quantities, Amounts, Weights)

---

## Field Categories Breakdown

| Category | Column Count | Column Range |
|----------|--------------|--------------|
| **Basic DO** | 3 | A-C |
| **Shipper** | 2 | D-E |
| **Carrier** | 3 | F-H |
| **Customer** | 7 | I-O |
| **Other Items** | 9 | P-X |
| **Carrier Fees** | 9 | Y-AG |
| **BOL** | 1 | AH |
| **Container/Shipment** | 3 | AI-AK |
| **Pickup Locations** | 18 | AL-BC |
| **Drop Locations** | 18 | BD-BU |
| **Return Location** | 7 | BV-CB |
| **Additional** | 2 | CC-CD |

---

## Important Notes

### 1. **Dropdown Fields**
- **Load Type (Column C)**: Must be either `OTR` or `DRAYAGE`
- **Equipment Type (Column H)**: 
  - For OTR: Dry Van, Reefer, Step Deck, Double Drop / Lowboy, Conestoga, Livestock Trailer, Car Hauler, Container Chassis, End Dump, Side Dump, Hopper Bottom
  - For DRAYAGE: 20' Standard, 40' Standard, 45' Standard, 20' Reefer, 40' Reefer, Open Top Container, Flat Rack Container, Tank Container, 40' High Cube, 45' High Cube

### 2. **Date Format**
- All dates must be in `YYYY-MM-DD` format
- Examples: `2024-01-15`, `2024-12-31`

### 3. **BOL Numbers**
- Format: Comma-separated values
- Example: `BOL001,BOL002,BOL003`

### 4. **Multiple Items/Fees**
- Use Item 1, Item 2, Item 3 columns for multiple entries
- Leave empty if not needed

### 5. **Multiple Locations**
- Use Location 1 and Location 2 columns for multiple pickups/drops
- Leave empty if only one location needed

### 6. **Return Location**
- Only used for DRAYAGE loads
- Leave empty for OTR loads

### 7. **No JSON Required**
- All fields are simple text/number fields
- Employees can fill in regular Excel cells
- Backend automatically converts flat fields to JSON format

---

## Excel Template Structure

When downloaded, the template contains:

1. **Row 1**: Headers (bold, gray background) - All 82 column headers
2. **Row 2**: Example data - Sample values for guidance
3. **Row 3**: Instructions (merged cells) - Blue italic text with guidelines
4. **Rows 4-1000**: Data entry rows with dropdown validation applied

---

## API Endpoints

- **Download Template**: `GET /api/v1/do/excel/template`
- **Upload Template**: `POST /api/v1/do/excel/upload`

---

## Example Row Data

```
Employee ID: EMP001
Date: 2024-01-15
Load Type: OTR (dropdown)
Shipper Name: Example Shipper Company
Carrier Name: Example Carrier Company
Equipment Type: Dry Van (dropdown)
Load No: LOAD001
Bill To: Example Bill To Company
Dispatcher Name: John Doe
Work Order No: WO001
Line Haul: 1000
FSC (%): 5
Other Item 1 Name: Fuel Surcharge
Other Item 1 Quantity: 1
Other Item 1 Amount: 50
Carrier Fee 1 Name: Lumper Fee
Carrier Fee 1 Quantity: 1
Carrier Fee 1 Amount: 100
BOL Numbers: BOL001,BOL002
Container No: CONT001
Pickup 1 Name: Warehouse A
Pickup 1 Address: 123 Main St
Pickup 1 City: New York
Pickup 1 State: NY
Pickup 1 ZipCode: 10001
Pickup 1 Weight: 10000
Pickup 1 Date: 2024-01-20
Drop 1 Name: Warehouse B
Drop 1 Address: 456 Oak Ave
Drop 1 City: Los Angeles
Drop 1 State: CA
Drop 1 ZipCode: 90001
Drop 1 Weight: 10000
Drop 1 Date: 2024-01-25
Assigned Company: Company Name
```

---

## Frontend Implementation

The template is generated in `src/Components/Sales/DeliveryOrder.jsx` in the `downloadDOExcelTemplate()` function. It first tries to download from the backend API, and if that fails, generates the template in the frontend using the XLSX library.

---

**Last Updated**: 2024
**Version**: 1.0
**Total Columns**: 82

