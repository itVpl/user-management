import React from 'react';
import AssignmentNotification from './AssignmentNotification';
import { useAssignmentNotification } from '../../hooks/useAssignmentNotification';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

const GlobalAssignmentNotification = () => {
  // Get current user info
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  let user = null;
  let empId = null;
  let isCMTUser = false;

  try {
    if (userStr) {
      user = JSON.parse(userStr);
      empId = user.empId || localStorage.getItem('empId') || sessionStorage.getItem('empId');
      
      // Check if user is from CMT department - multiple ways to check
      const dept = (user.department || '').toLowerCase();
      const designation = (user.designation || '').toLowerCase();
      const role = (user.role || '').toLowerCase();
      
      isCMTUser = dept === 'cmt' || 
                  dept.includes('cmt') ||
                  designation.includes('cmt') ||
                  role.includes('cmt') ||
                  // Also check from sessionStorage/localStorage if available
                  (localStorage.getItem('department') || sessionStorage.getItem('department') || '').toLowerCase() === 'cmt';
    } else {
      // Fallback: check directly from storage
      empId = localStorage.getItem('empId') || sessionStorage.getItem('empId');
      const dept = (localStorage.getItem('department') || sessionStorage.getItem('department') || '').toLowerCase();
      isCMTUser = dept === 'cmt' || dept.includes('cmt');
    }
  } catch (error) {
    console.error('Error parsing user data:', error);
    // Fallback check
    empId = localStorage.getItem('empId') || sessionStorage.getItem('empId');
    const dept = (localStorage.getItem('department') || sessionStorage.getItem('department') || '').toLowerCase();
    isCMTUser = dept === 'cmt' || dept.includes('cmt');
  }

  // Only enable notifications for CMT users
  const { newAssignment, clearNotification } = useAssignmentNotification(
    empId, 
    isCMTUser && !!empId
  );

  // Handle assignment notification actions
  const handleAcceptAssignment = () => {
    alertify.success('Assignment accepted!');
    clearNotification();
    // Optionally refresh the page or trigger a global refresh event
    window.dispatchEvent(new CustomEvent('assignmentAccepted'));
  };

  const handleCancelAssignment = () => {
    alertify.info('Assignment cancelled.');
    clearNotification();
  };

  // Don't render if not a CMT user or no assignment
  if (!isCMTUser || !newAssignment) {
    return null;
  }

  return (
    <AssignmentNotification
      assignment={newAssignment}
      onAccept={handleAcceptAssignment}
      onCancel={handleCancelAssignment}
      onClose={clearNotification}
    />
  );
};

export default GlobalAssignmentNotification;

