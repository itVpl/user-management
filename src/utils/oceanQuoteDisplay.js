  /**
 * Backend may store `assignedTo.employeeId` as an ObjectId or populate it into an Employee-like object.
 * React cannot render plain objects as children.
 */
export function formatEmployeeRefForDisplay(val) {
  if (val == null || val === '') return null;
  if (typeof val !== 'object') return String(val);
  const dept =
    val.department == null
      ? ''
      : typeof val.department === 'string'
        ? val.department
        : val.department?.name ?? '';
  const parts = [];
  const nameEmp = [val.employeeName, val.empId ? `(${val.empId})` : ''].filter(Boolean).join(' ');
  if (nameEmp) parts.push(nameEmp);
  if (val.email) parts.push(val.email);
  if (dept) parts.push(dept);
  if (val._id != null) parts.push(`ID: ${String(val._id)}`);
  return parts.length ? parts.join(' · ') : null;
}
