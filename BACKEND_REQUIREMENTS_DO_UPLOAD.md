# Backend Requirements: DO Additional Documents Upload Enhancement

## Overview
We need to add two new fields to the **Additional Documents (CMT Upload)** functionality in DO Details:
1. **Invoice Upload** - A separate file upload field specifically for invoices
2. **Due Date** - A date field for invoice due date

---

## Current API Implementation

### Endpoint
```
POST /api/v1/do/do/{doMongoId}/additional-documents
```

### Current Request Format
```javascript
FormData {
  empId: string,           // CMT Employee ID
  files: File[]            // Multiple files (PDF, DOC, DOCX, JPG, PNG, WEBP)
}
```

### Current Response Format
```json
{
  "success": true,
  "message": "Documents uploaded successfully",
  "data": {
    "documents": [
      {
        "_id": "...",
        "documentUrl": "https://...",
        "uploadedBy": {
          "empId": "...",
          "employeeName": "...",
          "department": "..."
        },
        "uploadedAt": "2025-01-06T..."
      }
    ]
  }
}
```

---

## Required Changes

### 1. Request Format Update

The API should now accept these additional fields:

```javascript
FormData {
  empId: string,                    // CMT Employee ID (existing)
  files: File[],                    // Additional documents (existing)
  invoiceFile: File,                 // NEW: Single invoice file (optional)
  dueDate: string                   // DEPRECATED: This field is ignored. Due date is automatically calculated as 30 days from invoice upload date.
}
```

**Field Details:**
- `invoiceFile`: Single file upload for invoice (PDF, DOC, DOCX, JPG, PNG, WEBP)
- `dueDate`: **DEPRECATED** - This field is ignored by the backend. Due date is automatically calculated as **30 days from the invoice upload date**.

**Important Notes:**
- Both new fields are optional. The API should work with existing functionality if these fields are not provided.
- **Due date is automatically calculated**: When invoice is uploaded, due date is set to **30 days from the upload date** (current date).
- When invoice is re-uploaded, both `uploadedAt` and `dueDate` are updated (due date recalculated as 30 days from new upload date).

---

### 2. Database Schema Update

The backend should store invoice information separately or extend the existing document model:

**Option A: Extend Document Model**
```javascript
{
  _id: ObjectId,
  doId: ObjectId,                    // Reference to DO
  documentUrl: String,               // File URL
  documentType: String,              // "additional" or "invoice"
  invoiceDueDate: Date,             // Only if documentType === "invoice"
  uploadedBy: {
    empId: String,
    employeeName: String,
    department: String
  },
  uploadedAt: Date
}
```

**Option B: Separate Invoice Collection**
```javascript
// Additional Documents Collection (existing)
{
  _id: ObjectId,
  doId: ObjectId,
  documentUrl: String,
  uploadedBy: {...},
  uploadedAt: Date
}

// Invoice Collection (new)
{
  _id: ObjectId,
  doId: ObjectId,
  invoiceUrl: String,
  dueDate: Date,
  uploadedBy: {
    empId: String,
    employeeName: String,
    department: String
  },
  uploadedAt: Date
}
```

**Recommendation:** Option A is simpler and keeps related documents together.

---

### 3. Response Format Update

When fetching documents, the API should distinguish between regular documents and invoices:

**GET `/api/v1/do/do/{doMongoId}/additional-documents`**

```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "_id": "...",
        "documentUrl": "https://...",
        "documentType": "additional",
        "uploadedBy": {...},
        "uploadedAt": "..."
      }
    ],
    "invoice": {
      "_id": "...",
      "invoiceUrl": "https://...",
      "dueDate": "2025-01-15T00:00:00.000Z",
      "uploadedBy": {...},
      "uploadedAt": "..."
    }
  }
}
```

**Note:** `invoice` can be `null` if no invoice has been uploaded yet.

---

### 4. Validation Requirements

**Invoice File:**
- File types: PDF, DOC, DOCX, JPG, PNG, WEBP
- Max file size: 10MB (same as other documents)
- Only one invoice file per DO (new upload should replace existing)

**Due Date:**
- **AUTOMATIC CALCULATION**: Due date is automatically calculated as **30 days from invoice upload date**
- No manual input required or accepted
- When invoice is re-uploaded, due date is recalculated from the new upload date

---

### 5. API Behavior

**Upload Scenarios:**

1. **Upload only additional documents (existing behavior):**
   ```
   FormData: { empId, files }
   → Upload files as additional documents
   → No invoice changes
   ```

2. **Upload invoice (due date auto-calculated):**
   ```
   FormData: { empId, invoiceFile }
   → Upload invoice file
   → Calculate due date as 30 days from upload date
   → Replace existing invoice if any
   ```

3. **Upload both:**
   ```
   FormData: { empId, files, invoiceFile }
   → Upload additional documents
   → Upload invoice file
   → Calculate due date as 30 days from upload date
   ```

4. **Re-upload invoice (updates both dates):**
   ```
   FormData: { empId, invoiceFile }
   → Replace existing invoice file
   → Update uploadedAt to new upload date
   → Recalculate due date as 30 days from new upload date
   ```

---

### 6. Error Handling

The API should return appropriate errors:

```json
{
  "success": false,
  "message": "Due date field is deprecated. Due date is automatically calculated.",
  "error": "DEPRECATED_FIELD"
}
```

```json
{
  "success": false,
  "message": "Invoice file size exceeds 10MB limit",
  "error": "FILE_TOO_LARGE"
}
```

```json
{
  "success": false,
  "message": "Invalid invoice file type. Allowed: PDF, DOC, DOCX, JPG, PNG, WEBP",
  "error": "INVALID_FILE_TYPE"
}
```

---

### 7. File Storage

- Store invoice files in the same storage location as other documents
- Use consistent naming convention (e.g., `invoice_{doId}_{timestamp}.{ext}`)
- Ensure proper file permissions and access control

---

## Summary Checklist for Backend Team

- [ ] Update POST endpoint to accept `invoiceFile` field
- [ ] Add validation for invoice file (type, size)
- [ ] **Implement automatic due date calculation**: Calculate due date as 30 days from invoice upload date
- [ ] Update database schema to store invoice and auto-calculated due date
- [ ] Implement invoice replacement logic (only one invoice per DO)
- [ ] When invoice is re-uploaded, update both `uploadedAt` and recalculate `dueDate`
- [ ] Update GET endpoint response to include invoice information separately
- [ ] Handle all upload scenarios (documents only, invoice only, both)
- [ ] Ignore/deprecate `dueDate` field in request (if sent, ignore it)
- [ ] Add proper error messages for validation failures
- [ ] Test file upload with all supported formats
- [ ] Ensure backward compatibility (existing functionality should still work)

---

## Questions for Discussion

1. ~~Should due date be required when uploading an invoice?~~ **RESOLVED**: Due date is automatically calculated as 30 days from upload date.
2. ~~Should we allow updating due date without re-uploading the invoice file?~~ **RESOLVED**: Due date is automatically calculated, cannot be manually updated.
3. Should there be a limit on how many times an invoice can be replaced?
4. Do we need to track invoice upload history/versioning?

---

## Frontend Implementation Notes

The frontend will:
- Add a separate file input for invoice upload
- **Remove manual due date input** (due date is auto-calculated)
- Display informational note that due date is auto-calculated as 30 days from upload
- Send invoice file in FormData request (no dueDate field)
- Display invoice separately in the UI with auto-calculated due date
- Show due date prominently (possibly with warning if overdue)
- Show note that due date is auto-calculated: "30 days from upload date"

