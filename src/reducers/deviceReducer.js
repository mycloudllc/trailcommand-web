// Device reducer for optimized state management
const DEVICE_ACTIONS = {
  SET_DEVICES: 'SET_DEVICES',
  ADD_DEVICE: 'ADD_DEVICE',
  UPDATE_DEVICE: 'UPDATE_DEVICE',
  UPDATE_DEVICE_STATUS: 'UPDATE_DEVICE_STATUS',
  DELETE_DEVICE: 'DELETE_DEVICE',
  CLEAR_DEVICES: 'CLEAR_DEVICES',
  SET_SELECTED_DEVICE: 'SET_SELECTED_DEVICE'
};

const initialDeviceState = {
  devices: [],
  selectedDevice: null,
  loading: false,
  error: null
};

const deviceReducer = (state, action) => {
  switch (action.type) {
    case DEVICE_ACTIONS.SET_DEVICES:
      return {
        ...state,
        devices: action.payload,
        loading: false,
        error: null
      };

    case DEVICE_ACTIONS.ADD_DEVICE:
      return {
        ...state,
        devices: [...state.devices, action.payload]
      };

    case DEVICE_ACTIONS.UPDATE_DEVICE:
      return {
        ...state,
        devices: state.devices.map(device =>
          device.device_id === action.payload.device_id
            ? { ...device, ...action.payload.updates }
            : device
        ),
        selectedDevice: state.selectedDevice?.device_id === action.payload.device_id
          ? { ...state.selectedDevice, ...action.payload.updates }
          : state.selectedDevice
      };

    case DEVICE_ACTIONS.UPDATE_DEVICE_STATUS:
      return {
        ...state,
        devices: state.devices.map(device =>
          device.device_id === action.payload.device_id
            ? { ...device, status: action.payload.status, last_seen: action.payload.last_seen }
            : device
        ),
        selectedDevice: state.selectedDevice?.device_id === action.payload.device_id
          ? { ...state.selectedDevice, status: action.payload.status, last_seen: action.payload.last_seen }
          : state.selectedDevice
      };

    case DEVICE_ACTIONS.DELETE_DEVICE:
      return {
        ...state,
        devices: state.devices.filter(device => device.device_id !== action.payload.device_id),
        selectedDevice: state.selectedDevice?.device_id === action.payload.device_id
          ? null
          : state.selectedDevice
      };

    case DEVICE_ACTIONS.SET_SELECTED_DEVICE:
      return {
        ...state,
        selectedDevice: action.payload
      };

    case DEVICE_ACTIONS.CLEAR_DEVICES:
      return {
        ...state,
        devices: [],
        selectedDevice: null
      };

    default:
      console.warn('Unknown device action:', action.type);
      return state;
  }
};

// Action creators
const deviceActions = {
  setDevices: (devices) => ({
    type: DEVICE_ACTIONS.SET_DEVICES,
    payload: devices
  }),

  addDevice: (device) => ({
    type: DEVICE_ACTIONS.ADD_DEVICE,
    payload: device
  }),

  updateDevice: (device_id, updates) => ({
    type: DEVICE_ACTIONS.UPDATE_DEVICE,
    payload: { device_id, updates }
  }),

  updateDeviceStatus: (device_id, status, last_seen = null) => ({
    type: DEVICE_ACTIONS.UPDATE_DEVICE_STATUS,
    payload: { device_id, status, last_seen }
  }),

  deleteDevice: (device_id) => ({
    type: DEVICE_ACTIONS.DELETE_DEVICE,
    payload: { device_id }
  }),

  setSelectedDevice: (device) => ({
    type: DEVICE_ACTIONS.SET_SELECTED_DEVICE,
    payload: device
  }),

  clearDevices: () => ({
    type: DEVICE_ACTIONS.CLEAR_DEVICES
  })
};

export { deviceReducer, deviceActions, DEVICE_ACTIONS, initialDeviceState };