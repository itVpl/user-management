// File: src/components/Inbox.jsx
import React, { useState, useEffect } from 'react';
import { FiInbox, FiSend, FiEdit, FiX, FiSend as SendIcon, FiTrash2, FiCornerUpLeft, FiCornerUpRight } from 'react-icons/fi';
import axios from 'axios';
import {BackArrow} from '../../assets/image'

const ComposeModal = ({ isOpen, onClose, onSend, mode = 'new', originalMessage = {} }) => {
  const [formData, setFormData] = useState({ to: '', subject: '', text: '' });

  useEffect(() => {
    if (mode === 'reply') {
      setFormData({
        to: originalMessage.from || '',
        subject: `RE: ${originalMessage.subject || ''}`,
        text: ''
      });
    } else if (mode === 'forward') {
      setFormData({
        to: '',
        subject: `FWD: ${originalMessage.subject || ''}`,
        text: `\n\nForward message\nFrom: ${originalMessage.from}\nDate: ${originalMessage.date}\nSubject: ${originalMessage.subject}\n\n${originalMessage.content}`
      });
    } else {
      setFormData({ to: '', subject: '', text: '' });
    }
  }, [mode, originalMessage]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSend = () => {
    onSend(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm  bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-11/12 max-w-4xl shadow-lg">
        <div className="bg-blue-100 text-center py-3 text-lg font-medium rounded-t-xl relative">
          {mode === 'reply' ? 'Reply' : mode === 'forward' ? 'Forward' : 'Create New mail'}
          <button className="absolute right-4 top-2 text-xl" onClick={onClose}>
            <FiX />
          </button>
        </div>
        <div className="px-6 py-4">
          <div className="border-b py-2">
            <input name="to" value={formData.to} onChange={handleChange} className="w-full outline-none" placeholder="To" />
          </div>
          <div className="border-b py-2">
            <input name="subject" value={formData.subject} onChange={handleChange} className="w-full outline-none" placeholder="Subject" />
          </div>
          <div>
            <textarea name="text" value={formData.text} onChange={handleChange} className="w-full h-64 outline-none mt-2 resize-none" placeholder="Write your message..." />
          </div>
          <div className="flex justify-between items-center mt-4">
            <button className="bg-blue-500 text-white px-6 py-2 rounded-full flex items-center gap-2" onClick={handleSend}>
              Send <SendIcon />
            </button>
            <FiTrash2 className="text-xl text-gray-400 cursor-pointer" />
          </div>
        </div>
      </div>
    </div>
  );
};

const Inbox = () => {
  const [tab, setTab] = useState('received');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState('new');
  const [originalMessage, setOriginalMessage] = useState({});
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);

  const fetchInbox = async () => {
    try {
      const res = await axios.get('https://vpl-liveproject-1.onrender.com/api/v1/email-inbox/inbox', {
        withCredentials: true,
      });
      console.log('Inbox fetched successfully:', res.data);
      setEmails(Array.isArray(res.data.emails) ? res.data.emails : []);
    } catch (err) {
      console.error('Failed to fetch inbox:', err.response || err);
    }
  };

  const handleSend = async (formData) => {
    try {
      await axios.post('https://vpl-liveproject-1.onrender.com/api/v1/email-inbox/send', formData);
      fetchInbox();
    } catch (err) {
      console.error('Send failed:', err);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  const handleReply = (email) => {
    setComposeMode('reply');
    setOriginalMessage(email);
    setIsComposeOpen(true);
  };

  const handleForward = (email) => {
    setComposeMode('forward');
    setOriginalMessage(email);
    setIsComposeOpen(true);
  };

  const renderMessages = () => {
    if (selectedEmail) {
      return (
        <div className="bg-white p-6 rounded shadow">
                    <button
              className="px-1 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
              onClick={() => setSelectedEmail(null)}
            >
              <img src={BackArrow} alt="BackArrowButton"/>
            </button>
          <div className="text-sm text-right text-gray-400 mb-2">
            {selectedEmail.date}
          </div>
          <h2 className="text-xl font-bold mb-2">{selectedEmail.subject}</h2>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gray-300 rounded-full h-10 w-10 flex items-center justify-center font-bold text-white">
              {selectedEmail.from?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <div className="font-semibold text-gray-800">{selectedEmail.from}</div>
              <div className="text-sm text-gray-500">{selectedEmail.to}</div>
            </div>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">{selectedEmail.content}</p>
          <div className="flex justify-end mt-4 gap-2">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 flex items-center gap-1"
              onClick={() => handleReply(selectedEmail)}
            >
              <FiCornerUpLeft /> Reply
            </button>
            <button
              className="px-4 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 flex items-center gap-1"
              onClick={() => handleForward(selectedEmail)}
            >
              <FiCornerUpRight /> Forward
            </button>
          </div>
        </div>
      );
    }

    const filteredEmails =
      tab === 'received'
        ? emails.filter((e) => e.from && !e.sent && !e.isDraft)
        : tab === 'sent'
        ? emails.filter((e) => e.sent)
        : emails.filter((e) => e.isDraft);

    if (filteredEmails.length === 0) {
      return (
        <div className="text-center mt-12 text-gray-500">
          <FiInbox className="mx-auto text-4xl mb-2" />
          <p>No messages</p>
        </div>
      );
    }

    return filteredEmails.map((email) => (
      <div
        key={email.uid}
        className="bg-white shadow rounded p-4 mb-3 hover:bg-gray-50 cursor-pointer"
        onClick={() => setSelectedEmail(email)}
      >
        <div className="font-semibold text-blue-700">{email.subject}</div>
        {/* <div className="text-sm text-gray-600">{email.from}</div>
        <div className="text-xs text-gray-400">{email.date}</div>
        <div className="mt-2 text-gray-700 text-sm">
          {email.content?.slice(0, 120)}...
        </div> */}
      </div>
    ));
  };

  return (
    <div className="p-4">
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSend={handleSend}
        mode={composeMode}
        originalMessage={originalMessage}
      />

      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <button
            className={`px-4 py-2 rounded-full border ${tab === 'received' ? 'bg-blue-500 text-white' : 'text-blue-500 border-blue-500'}`}
            onClick={() => {
              setTab('received');
              setSelectedEmail(null);
            }}
          >
            Received
          </button>
          {/* <button
            className={`px-4 py-2 rounded-full border ${tab === 'sent' ? 'bg-blue-500 text-white' : 'text-blue-500 border-blue-500'}`}
            onClick={() => {
              setTab('sent');
              setSelectedEmail(null);
            }}
          >
            Sent
          </button>
          <button
            className={`px-4 py-2 rounded-full border ${tab === 'draft' ? 'bg-blue-500 text-white' : 'text-blue-500 border-blue-500'}`}
            onClick={() => {
              setTab('draft');
              setSelectedEmail(null);
            }}
          >
            Draft
          </button> */}
        </div>
        <button
          className="bg-blue-100 text-blue-800 font-medium px-4 py-2 rounded-lg hover:bg-blue-200"
          onClick={() => {
            setComposeMode('new');
            setIsComposeOpen(true);
          }}
        >
          Compose E-mail
        </button>
      </div>

      {renderMessages()}
    </div>
  );
};

export default Inbox;
