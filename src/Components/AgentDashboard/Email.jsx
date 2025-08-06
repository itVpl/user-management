import React, { useState } from 'react';
import {
  FiInbox,
  FiStar,
  FiSend,
  FiTrash2,
  FiX,
  FiEdit,
  FiCornerUpLeft,
  FiCornerUpRight,
} from 'react-icons/fi';
import { BackArrow } from '../../assets/image';

const staticEmails = [
  {
    uid: '1',
    from: 'john.doe@example.com',
    to: 'you@vpl.com',
    subject: '🚀 Project Update – Phase 2',
    content: 'Hi Team,\n\nJust wanted to give a quick update on Phase 2 of the project. We are 80% done.\n\nThanks,\nJohn',
    date: 'Aug 05',
    isStarred: false,
    isRead: false,
  },
  {
    uid: '2',
    from: 'noreply@github.com',
    to: 'you@vpl.com',
    subject: '🔒 New Login to GitHub',
    content: 'Hey,\n\nWe noticed a new login from a new device. If this wasn’t you, change your password.',
    date: 'Aug 04',
    isStarred: true,
    isRead: true,
  },
  {
    uid: '3',
    from: 'sales@vpowerlogistics.com',
    to: 'you@vpl.com',
    subject: '📦 Freight Rate Request',
    content: 'Can you share your latest rates for FTL from New York to Texas?',
    date: 'Aug 03',
    isStarred: false,
    isRead: true,
  },
];

const ComposeModal = ({ isOpen, onClose, onSend }) => {
  const [formData, setFormData] = useState({ to: '', subject: '', text: '' });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSend = () => {
    onSend(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white px-6 py-3 flex justify-between items-center rounded-t-2xl">
          <span className="font-bold text-lg">New Message</span>
          <FiX className="cursor-pointer hover:text-red-300" onClick={onClose} />
        </div>
        <div className="p-6 space-y-4">
          <input
            name="to"
            placeholder="To"
            value={formData.to}
            onChange={handleChange}
            className="w-full border border-gray-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-pink-400"
          />
          <input
            name="subject"
            placeholder="Subject"
            value={formData.subject}
            onChange={handleChange}
            className="w-full border border-gray-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-pink-400"
          />
          <textarea
            name="text"
            placeholder="Write your message..."
            value={formData.text}
            onChange={handleChange}
            className="w-full h-40 border border-gray-300 p-3 rounded-lg outline-none resize-none focus:ring-2 focus:ring-pink-400"
          />
          <div className="flex justify-between">
            <button
              onClick={handleSend}
              className="bg-gradient-to-r from-green-400 to-blue-500 text-white px-6 py-2 rounded-full flex items-center gap-2 shadow-lg hover:scale-105 transition"
            >
              <FiSend /> Send
            </button>
            <FiTrash2 className="text-xl text-gray-400 cursor-pointer hover:text-red-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

const Inbox = () => {
  const [emails, setEmails] = useState(staticEmails);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const toggleStar = (uid) => {
    setEmails((prev) =>
      prev.map((email) =>
        email.uid === uid ? { ...email, isStarred: !email.isStarred } : email
      )
    );
  };

  const handleSend = (newMail) => {
    const newEmail = {
      uid: String(Date.now()),
      ...newMail,
      from: 'you@vpl.com',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      isStarred: false,
      isRead: false,
    };
    setEmails([newEmail, ...emails]);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-tr from-sky-100 via-white to-indigo-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-xl p-4 border-r space-y-4">
        <button
          onClick={() => setIsComposeOpen(true)}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-2 rounded-full flex items-center justify-center gap-2 shadow-lg hover:scale-105 transition"
        >
          <FiEdit /> Compose
        </button>
        <div className="space-y-3 text-sm font-semibold text-gray-700">
          <div className="flex items-center gap-3 hover:text-blue-500 cursor-pointer">
            <FiInbox /> Inbox
          </div>
          <div className="flex items-center gap-3 hover:text-yellow-500 cursor-pointer">
            <FiStar /> Starred
          </div>
          <div className="flex items-center gap-3 hover:text-green-500 cursor-pointer">
            <FiSend /> Sent
          </div>
          <div className="flex items-center gap-3 hover:text-red-500 cursor-pointer">
            <FiTrash2 /> Trash
          </div>
        </div>
      </div>

      {/* Main Email Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        <ComposeModal isOpen={isComposeOpen} onClose={() => setIsComposeOpen(false)} onSend={handleSend} />

        {!selectedEmail ? (
          <div className="space-y-4">
            {emails.map((email) => (
              <div
                key={email.uid}
                className={`bg-white rounded-2xl p-4 shadow-md flex items-center justify-between cursor-pointer transition-transform  ${
                  !email.isRead ? 'border-l-4 border-pink-500 bg-pink-50/30' : ''
                }`}
                onClick={() => setSelectedEmail({ ...email, isRead: true })}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-yellow-400 to-red-500 text-white flex items-center justify-center font-bold text-sm animate-pulse shadow-inner">
                    {email.from.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-md font-semibold text-blue-700">{email.subject}</div>
                    <div className="text-sm text-gray-500">{email.content.slice(0, 50)}...</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">{email.date}</span>
                  <FiStar
                    className={`cursor-pointer hover:scale-110 ${
                      email.isStarred ? 'text-yellow-500' : 'text-gray-400'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar(email.uid);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 shadow-2xl animate-fade-in">
            <button
              onClick={() => setSelectedEmail(null)}
              className="mb-4 flex items-center text-gray-500 hover:text-black"
            >
              <img src={BackArrow} alt="Back" className="w-4 h-4 mr-2" />
              Back to Inbox
            </button>
            <div className="text-sm text-right text-gray-400">{selectedEmail.date}</div>
            <h2 className="text-2xl font-bold text-blue-800 mb-2">{selectedEmail.subject}</h2>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-tr from-pink-500 to-orange-500 text-white h-10 w-10 rounded-full flex items-center justify-center font-bold uppercase">
                {selectedEmail.from.charAt(0)}
              </div>
              <div>
                <div className="font-semibold">{selectedEmail.from}</div>
                <div className="text-sm text-gray-500">To: {selectedEmail.to}</div>
              </div>
            </div>
            <div className="whitespace-pre-wrap text-gray-800 text-[15px]">{selectedEmail.content}</div>
            <div className="flex justify-end mt-6 gap-3">
              <button className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 flex items-center gap-1">
                <FiCornerUpLeft /> Reply
              </button>
              <button className="bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 flex items-center gap-1">
                <FiCornerUpRight /> Forward
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
