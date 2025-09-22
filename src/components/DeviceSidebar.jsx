import React from 'react';
import {
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Plus,
  Settings
} from 'lucide-react';

const DeviceSidebar = React.memo(({
  devices,
  selectedDevice,
  onDeviceSelect,
  sidebarCollapsed,
  onToggleSidebar,
  editMode,
  onToggleEdit,
  onShowAddDevice,
  onShowSettings,
  connected
}) => {
  return (
    <div className={`bg-white shadow-lg transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'} flex flex-col`}>
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!sidebarCollapsed && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Devices</h2>
            <div className="flex items-center space-x-2 mt-1">
              {connected ? (
                <><Wifi className="w-4 h-4 text-green-500" /><span className="text-sm text-green-600">Connected</span></>
              ) : (
                <><WifiOff className="w-4 h-4 text-red-500" /><span className="text-sm text-red-600">Disconnected</span></>
              )}
            </div>
          </div>
        )}
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Device List */}
      <div className="flex-1 overflow-y-auto">
        {!sidebarCollapsed && (
          <div className="p-2">
            {devices.map((device) => (
              <div
                key={device.device_id}
                onClick={() => onDeviceSelect(device)}
                className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                  selectedDevice?.device_id === device.device_id
                    ? 'bg-blue-100 border-2 border-blue-300'
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Smartphone className="w-5 h-5 text-gray-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {device.name || `Device ${device.device_id}`}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      ID: {device.device_id}
                    </p>
                    <div className="flex items-center mt-1">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        device.status === 'online' ? 'bg-green-400' : 'bg-gray-400'
                      }`} />
                      <span className="text-xs text-gray-500 capitalize">
                        {device.status || 'offline'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      {!sidebarCollapsed && (
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            onClick={onShowAddDevice}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Device</span>
          </button>

          <div className="flex space-x-2">
            <button
              onClick={onToggleEdit}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                editMode
                  ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {editMode ? 'Exit Edit' : 'Edit Mode'}
            </button>

            <button
              onClick={onShowSettings}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

DeviceSidebar.displayName = 'DeviceSidebar';

export default DeviceSidebar;