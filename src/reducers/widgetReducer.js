// Widget reducer for optimized state management
const WIDGET_ACTIONS = {
  SET_WIDGETS: 'SET_WIDGETS',
  ADD_WIDGET: 'ADD_WIDGET',
  UPDATE_WIDGET: 'UPDATE_WIDGET',
  UPDATE_WIDGET_VALUE: 'UPDATE_WIDGET_VALUE',
  UPDATE_WIDGET_POSITION: 'UPDATE_WIDGET_POSITION',
  UPDATE_MULTIPLE_WIDGETS: 'UPDATE_MULTIPLE_WIDGETS',
  DELETE_WIDGET: 'DELETE_WIDGET',
  CLEAR_WIDGETS: 'CLEAR_WIDGETS',
  BATCH_UPDATE_POSITIONS: 'BATCH_UPDATE_POSITIONS'
};

const widgetReducer = (state, action) => {
  switch (action.type) {
    case WIDGET_ACTIONS.SET_WIDGETS:
      return action.payload;

    case WIDGET_ACTIONS.ADD_WIDGET:
      return [...state, action.payload];

    case WIDGET_ACTIONS.UPDATE_WIDGET:
      return state.map(widget =>
        widget.id === action.payload.id
          ? { ...widget, ...action.payload.updates }
          : widget
      );

    case WIDGET_ACTIONS.UPDATE_WIDGET_VALUE:
      return state.map(widget =>
        widget.id === action.payload.id
          ? { ...widget, value: action.payload.value }
          : widget
      );

    case WIDGET_ACTIONS.UPDATE_WIDGET_POSITION:
      return state.map(widget =>
        widget.id === action.payload.id
          ? { ...widget, position: { ...widget.position, ...action.payload.position } }
          : widget
      );

    case WIDGET_ACTIONS.UPDATE_MULTIPLE_WIDGETS:
      // Batch update for better performance
      const updates = new Map(action.payload.map(update => [update.id, update]));
      return state.map(widget => {
        const update = updates.get(widget.id);
        return update ? { ...widget, ...update.updates } : widget;
      });

    case WIDGET_ACTIONS.BATCH_UPDATE_POSITIONS:
      // Optimized batch position update
      const positionUpdates = new Map(action.payload.map(update => [update.id, update.position]));
      return state.map(widget => {
        const newPosition = positionUpdates.get(widget.id);
        return newPosition ? { ...widget, position: { ...widget.position, ...newPosition } } : widget;
      });

    case WIDGET_ACTIONS.DELETE_WIDGET:
      return state.filter(widget => widget.id !== action.payload.id);

    case WIDGET_ACTIONS.CLEAR_WIDGETS:
      return [];

    default:
      console.warn('Unknown widget action:', action.type);
      return state;
  }
};

// Action creators for better type safety and consistency
const widgetActions = {
  setWidgets: (widgets) => ({
    type: WIDGET_ACTIONS.SET_WIDGETS,
    payload: widgets
  }),

  addWidget: (widget) => ({
    type: WIDGET_ACTIONS.ADD_WIDGET,
    payload: widget
  }),

  updateWidget: (id, updates) => ({
    type: WIDGET_ACTIONS.UPDATE_WIDGET,
    payload: { id, updates }
  }),

  updateWidgetValue: (id, value) => ({
    type: WIDGET_ACTIONS.UPDATE_WIDGET_VALUE,
    payload: { id, value }
  }),

  updateWidgetPosition: (id, position) => ({
    type: WIDGET_ACTIONS.UPDATE_WIDGET_POSITION,
    payload: { id, position }
  }),

  updateMultipleWidgets: (updates) => ({
    type: WIDGET_ACTIONS.UPDATE_MULTIPLE_WIDGETS,
    payload: updates
  }),

  batchUpdatePositions: (positionUpdates) => ({
    type: WIDGET_ACTIONS.BATCH_UPDATE_POSITIONS,
    payload: positionUpdates
  }),

  deleteWidget: (id) => ({
    type: WIDGET_ACTIONS.DELETE_WIDGET,
    payload: { id }
  }),

  clearWidgets: () => ({
    type: WIDGET_ACTIONS.CLEAR_WIDGETS
  })
};

export { widgetReducer, widgetActions, WIDGET_ACTIONS };