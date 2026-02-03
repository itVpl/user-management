/**
 * RightSideDrawer Usage Examples
 * 
 * This file shows different ways to use the RightSideDrawer component
 */

import React, { useState } from 'react';
import RightSideDrawer from './RightSideDrawer';
import { Settings, Info, Bell, HelpCircle, Plug } from 'lucide-react';

// ============================================
// Example 1: Basic Usage
// ============================================
export function BasicExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <h1>My Component</h1>
      
      <RightSideDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(!isOpen)}
        title="My Drawer"
      >
        <p>This is basic drawer content</p>
      </RightSideDrawer>
    </div>
  );
}

// ============================================
// Example 2: With Custom Icon and Width
// ============================================
export function CustomIconExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <h1>My Component</h1>
      
      <RightSideDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(!isOpen)}
        title="Settings"
        width={35} // 35% width instead of default 30%
        icon={Settings}
        iconText="Settings"
      >
        <div className="space-y-4">
          <h3>Settings Panel</h3>
          <p>Customize your settings here</p>
        </div>
      </RightSideDrawer>
    </div>
  );
}

// ============================================
// Example 3: With Rich Content
// ============================================
export function RichContentExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <h1>Dashboard</h1>
      
      <RightSideDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(!isOpen)}
        title="Notifications"
        icon={Bell}
        iconText="Notifications"
      >
        <div className="space-y-4">
          {/* Stats Card */}
          <div className="bg-white rounded-lg p-4 shadow">
            <h4 className="font-semibold mb-2">Quick Stats</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Items:</span>
                <span className="font-bold">150</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg p-4 shadow">
            <h4 className="font-semibold mb-2">Quick Actions</h4>
            <button className="w-full bg-blue-500 text-white py-2 rounded">
              Action Button
            </button>
          </div>
        </div>
      </RightSideDrawer>
    </div>
  );
}

// ============================================
// Example 4: Without Icon Button (Manual Control)
// ============================================
export function ManualControlExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <h1>My Component</h1>
      
      {/* Manual trigger button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Open Drawer
      </button>
      
      <RightSideDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Manual Control"
        showIcon={false} // Hide the plugin icon
      >
        <p>This drawer is controlled manually</p>
      </RightSideDrawer>
    </div>
  );
}

// ============================================
// Example 5: Multiple Drawers
// ============================================
export function MultipleDrawersExample() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div>
      <h1>My Component</h1>
      
      {/* Settings Drawer */}
      <RightSideDrawer
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(!settingsOpen)}
        title="Settings"
        icon={Settings}
        iconText="Settings"
        width={30}
        iconStyle={{ top: '40%' }} // Custom position
      >
        <p>Settings content</p>
      </RightSideDrawer>

      {/* Help Drawer */}
      <RightSideDrawer
        isOpen={helpOpen}
        onClose={() => setHelpOpen(!helpOpen)}
        title="Help & Support"
        icon={HelpCircle}
        iconText="Help"
        width={30}
        iconStyle={{ top: '60%' }} // Different position
      >
        <p>Help content</p>
      </RightSideDrawer>
    </div>
  );
}

// ============================================
// Example 6: With Form Content
// ============================================
export function FormExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });

  return (
    <div>
      <h1>My Component</h1>
      
      <RightSideDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(!isOpen)}
        title="Add New Item"
        icon={Plug}
      >
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-lg"
          >
            Submit
          </button>
        </form>
      </RightSideDrawer>
    </div>
  );
}

/**
 * PROPS REFERENCE:
 * 
 * isOpen: boolean (required)
 *   - Controls drawer visibility
 * 
 * onClose: function (required)
 *   - Callback when drawer should close/toggle
 * 
 * children: ReactNode (required)
 *   - Content to display in drawer
 * 
 * title: string (optional, default: 'Drawer')
 *   - Drawer header title
 * 
 * width: number (optional, default: 30)
 *   - Width percentage (e.g., 30 = 30% of screen)
 * 
 * icon: ReactComponent (optional, default: Plug)
 *   - Icon component from lucide-react or custom
 * 
 * iconPosition: 'fixed' | 'relative' (optional, default: 'fixed')
 *   - Position of plugin icon button
 * 
 * iconStyle: object (optional)
 *   - Custom styles for icon button
 * 
 * showIcon: boolean (optional, default: true)
 *   - Show/hide the plugin icon button
 * 
 * iconText: string (optional)
 *   - Text to display next to icon
 */




