'use strict';

var DragDropActionCreators = require('../actions/DragDropActionCreators'),
    DragDropStore = require('../stores/DragDropStore'),
    NativeDragDropSupport = require('../utils/NativeDragDropSupport'),
    EnterLeaveMonitor = require('../utils/EnterLeaveMonitor'),
    configureDataTransfer = require('../utils/configureDataTransfer'),
    isFileDragDropEvent = require('../utils/isFileDragDropEvent'),
    bindAll = require('../utils/bindAll'),
    invariant = require('react/lib/invariant'),
    merge = require('react/lib/merge'),
    union = require('lodash-node/modern/arrays/union'),
    without = require('lodash-node/modern/arrays/without'),
    isObject = require('lodash-node/modern/objects/isObject');

/**
 * Use this mixin to define drag sources and drop targets.
 */
var DragDropMixin = {
  getInitialState() {
    var state = {
      ownDraggedItemType: null,
      hasDragEntered: false
    };

    return merge(state, this.getStateFromDragDropStore());
  },

  getActiveDropTargetType() {
    var { draggedItemType, draggedItem, ownDraggedItemType } = this.state,
        dropTarget = this._dropTargets[draggedItemType];

    if (!dropTarget) {
      return null;
    }

    if (draggedItemType === ownDraggedItemType) {
      return null;
    }

    var { canDrop } = dropTarget;
    if (!canDrop || canDrop(draggedItem)) {
      return draggedItemType;
    } else {
      return null;
    }
  },

  isAnyDropTargetActive(types) {
    return types.indexOf(this.getActiveDropTargetType()) > -1;
  },

  getStateFromDragDropStore() {
    return {
      draggedItem: DragDropStore.getDraggedItem(),
      draggedItemType: DragDropStore.getDraggedItemType()
    };
  },

  getDragState(type) {
    invariant(this._dragSources[type], 'No drag source for %s', type);

    return {
      isDragging: this.state.ownDraggedItemType === type
    };
  },

  getDropState(type) {
    invariant(this._dropTargets[type], 'No drop target for %s', type);

    var isDragging = this.getActiveDropTargetType() === type,
        hasDragEntered = this.state.hasDragEntered;

    return {
      isDragging: isDragging,
      isHovering: isDragging && hasDragEntered
    };
  },

  componentWillMount() {
    this._monitor = new EnterLeaveMonitor();
    this._dragSources = {};
    this._dropTargets = {};

    invariant(this.configureDragDrop, 'Implement configureDragDrop(registerType) to use DragDropMixin');
    this.configureDragDrop(this.registerDragDropItemTypeHandlers);
  },

  componentDidMount() {
    DragDropStore.addChangeListener(this.handleDragDropStoreChange);
  },

  componentWillUnmount() {
    DragDropStore.removeChangeListener(this.handleDragDropStoreChange);
  },

  registerDragDropItemTypeHandlers(type, handlers) {
    var { dragSource, dropTarget } = handlers;

    if (dragSource) {
      invariant(!this._dragSources[type], 'Drag source for %s specified twice', type);
      this._dragSources[type] = bindAll(dragSource, this);
    }

    if (dropTarget) {
      invariant(!this._dropTargets[type], 'Drop target for %s specified twice', type);
      this._dropTargets[type] = bindAll(dropTarget, this);
    }
  },

  handleDragDropStoreChange() {
    this.setState(this.getStateFromDragDropStore());
  },

  dragSourceFor(type) {
    invariant(this._dragSources[type], 'No drag source for %s', type);

    // TODO: optimize by caching binds
    return {
      draggable: true,
      onDragStart: this.handleDragStart.bind(this, type),
      onDragEnd: this.handleDragEnd.bind(this, type)
    };
  },

  handleDragStart(type, e) {
    var { canDrag, beginDrag } = this._dragSources[type];

    if (canDrag && !canDrag(e)) {
      e.preventDefault();
      return;
    }

    // Some browser-specific fixes rely on knowing
    // current dragged element and its dragend handler.
    NativeDragDropSupport.handleDragStart(
      e.target,
      this.handleDragEnd.bind(this, type, null)
    );

    var dragOptions = beginDrag(e),
        { item } = dragOptions;

    configureDataTransfer(this.getDOMNode(), e.nativeEvent, dragOptions);
    invariant(isObject(item), 'Expected return value of beginDrag to contain "item" object');

    DragDropActionCreators.startDragging(type, item);

    // Delay setting own state by a tick so `getDragState(type).isDragging`
    // doesn't return `true` yet. Otherwise browser will capture dragged state
    // as the element screenshot.

    setTimeout(() => {
      if (this.isMounted() && DragDropStore.getDraggedItem() === item) {
        this.setState({
          ownDraggedItemType: type
        });
      }
    });
  },

  handleDragEnd(type, e) {
    NativeDragDropSupport.handleDragEnd();

    var { endDrag } = this._dragSources[type],
        didDrop = DragDropStore.didDrop();

    DragDropActionCreators.endDragging();

    if (!this.isMounted()) {

      // Note: this method may be invoked even *after* component was unmounted
      // This happens if source node was removed from DOM while dragging.

      return;
    }

    this.setState({
      ownDraggedItemType: null
    });

    if (endDrag) {
      endDrag(didDrop, e);
    }
  },

  dropTargetFor(...types) {
    types.forEach(type => {
      invariant(this._dropTargets[type], 'No drop target for %s', type);
    });

    // TODO: optimize by caching binds
    return {
      onDragEnter: this.handleDragEnter.bind(this, types),
      onDragOver: this.handleDragOver.bind(this, types),
      onDragLeave: this.handleDragLeave.bind(this, types),
      onDrop: this.handleDrop.bind(this, types)
    };
  },

  handleDragOver(types, e) {
    if (!this.isAnyDropTargetActive(types)) {
      return;
    }

    e.preventDefault();

    var { over } = this._dropTargets[this.state.draggedItemType];
    if (over) {
      over(this.state.draggedItem, e);
    }
  },

  handleDragEnter(types, e) {
    if (!this.isAnyDropTargetActive(types)) {
      return;
    }

    if (!this._monitor.enter(e.target)) {
      return;
    }

    this.setState({
      hasDragEntered: true
    });

    var { enter } = this._dropTargets[this.state.draggedItemType];
    if (enter) {
      enter(this.state.draggedItem, e);
    }
  },

  handleDragLeave(types, e) {
    if (!this.isAnyDropTargetActive(types)) {
      return;
    }

    if (!this._monitor.leave(e.target)) {
      return;
    }

    this.setState({
      hasDragEntered: false
    });

    var { leave } = this._dropTargets[this.state.draggedItemType];
    if (leave) {
      leave(this.state.draggedItem, e);
    }
  },

  handleDrop(types, e) {
    if (!this.isAnyDropTargetActive(types)) {
      return;
    }

    e.preventDefault();

    var item = this.state.draggedItem,
        { acceptDrop } = this._dropTargets[this.state.draggedItemType];

    if (isFileDragDropEvent(e)) {
      // We don't know file list until the `drop` event,
      // so we couldn't put `item` into the store.
      item = {
        files: Array.prototype.slice.call(e.dataTransfer.files)
      };
    }

    this._monitor.reset();

    this.setState({
      hasDragEntered: false
    });

    if (!acceptDrop || acceptDrop(item, e) !== false) {
      DragDropActionCreators.recordDrop();
    }
  }
};

module.exports = DragDropMixin;
