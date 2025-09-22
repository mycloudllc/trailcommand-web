import React, { useMemo, useCallback } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const WidgetGrid = React.memo(({
  widgets,
  editMode,
  onWidgetChange,
  onLayoutChange,
  onWidgetDelete,
  onWidgetEdit,
  renderWidget
}) => {
  // Memoize layout calculation
  const layout = useMemo(() => {
    return widgets.map(widget => ({
      i: widget.id,
      x: widget.position?.x || 0,
      y: widget.position?.y || 0,
      w: widget.position?.w || 2,
      h: widget.position?.h || 2,
      minW: 1,
      minH: 1,
      maxW: 12,
      maxH: 12
    }));
  }, [widgets]);

  // Memoize breakpoints configuration
  const breakpoints = useMemo(() => ({
    lg: 1200,
    md: 996,
    sm: 768,
    xs: 480,
    xxs: 0
  }), []);

  const cols = useMemo(() => ({
    lg: 12,
    md: 10,
    sm: 6,
    xs: 4,
    xxs: 2
  }), []);

  // Optimized layout change handler
  const handleLayoutChange = useCallback((newLayout) => {
    if (onLayoutChange) {
      onLayoutChange(newLayout);
    }
  }, [onLayoutChange]);

  // Memoized widget renderer
  const MemoizedWidget = React.memo(({ widget }) => {
    return (
      <div key={widget.id} className="widget-container bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {editMode && (
          <div className="widget-controls absolute top-2 right-2 z-10 flex space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onWidgetEdit?.(widget);
              }}
              className="p-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              title="Edit Widget"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onWidgetDelete?.(widget.id);
              }}
              className="p-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              title="Delete Widget"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
        {renderWidget ? renderWidget(widget) : (
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-800">{widget.type}</h3>
            <p className="text-2xl font-bold text-gray-900">{widget.value || 0}</p>
          </div>
        )}
      </div>
    );
  }, (prevProps, nextProps) => {
    // Custom comparison for optimized re-rendering
    return (
      prevProps.widget.id === nextProps.widget.id &&
      prevProps.widget.value === nextProps.widget.value &&
      prevProps.widget.config === nextProps.widget.config &&
      JSON.stringify(prevProps.widget.position) === JSON.stringify(nextProps.widget.position)
    );
  });

  return (
    <div className="widget-grid flex-1 p-4 overflow-auto">
      {widgets.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No widgets yet</h3>
            <p className="text-gray-500 mb-4">Add your first widget to get started</p>
          </div>
        </div>
      ) : (
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: layout }}
          breakpoints={breakpoints}
          cols={cols}
          rowHeight={60}
          onLayoutChange={handleLayoutChange}
          isDraggable={editMode}
          isResizable={editMode}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          useCSSTransforms={true}
          preventCollision={false}
          compactType="vertical"
        >
          {widgets.map(widget => (
            <div key={widget.id}>
              <MemoizedWidget widget={widget} />
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
});

WidgetGrid.displayName = 'WidgetGrid';

export default WidgetGrid;