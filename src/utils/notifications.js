import { toast } from 'react-toastify';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

// Simple notification utilities that work with your existing setup

export const showSuccess = (message) => {
  toast.success(message, {
    position: "top-right",
    autoClose: 3000,
  });
};

export const showError = (message) => {
  toast.error(message, {
    position: "top-right",
    autoClose: 4000,
  });
};

export const showWarning = (message) => {
  toast.warning(message, {
    position: "top-right",
    autoClose: 4000,
  });
};

export const showInfo = (message) => {
  toast.info(message, {
    position: "top-right",
    autoClose: 3000,
  });
};

// Use existing alertify for simple alerts
export const showAlertifySuccess = (message) => {
  alertify.success(message);
};

export const showAlertifyError = (message) => {
  alertify.error(message);
};

export const showConfirm = (title, message, onConfirm, onCancel) => {
  alertify.confirm(title, message, 
    function() {
      if (onConfirm) onConfirm();
    },
    function() {
      if (onCancel) onCancel();
    }
  );
};

// Enhanced notification utilities for chat and negotiation messages
export const showChatNotification = (loadId, senderName, message, onClick) => {
  alertify.set('notifier', 'position', 'top-right');
  
  const eventDetail = JSON.stringify({
    loadId: loadId,
    senderName: senderName,
    action: 'openChat'
  });
  
  alertify.success(
    `<div style="cursor: pointer;" onclick='${onClick ? `(${onClick.toString()})()` : `window.dispatchEvent(new CustomEvent("OPEN_LOAD_CHAT", { detail: ${eventDetail} }))`}'>
      <strong>💬 Load #${loadId}</strong><br/>
      ${senderName}: ${message?.substring(0, 40)}${message?.length > 40 ? '...' : ''}
    </div>`,
    0
  );
};

export const showNegotiationNotification = (bidId, loadId, rate, message, onClick) => {
  alertify.set('notifier', 'position', 'top-right');
  
  const eventDetail = JSON.stringify({
    bidId: bidId,
    loadId: loadId,
    rate: rate,
    action: 'openNegotiation'
  });
  
  alertify.success(
    `<div style="cursor: pointer;" onclick='${onClick ? `(${onClick.toString()})()` : `window.dispatchEvent(new CustomEvent("OPEN_NEGOTIATION", { detail: ${eventDetail} }))`}'>
      <strong>💰 Negotiation - Load #${loadId}</strong><br/>
      Rate: $${rate?.toLocaleString()} - ${message?.substring(0, 30)}${message?.length > 30 ? '...' : ''}
    </div>`,
    0
  );
};