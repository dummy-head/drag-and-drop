'use strict';

import React, { PropTypes, createClass } from 'react';
import { configureDragDrop } from 'react-dnd';

const style = {
  height: '12rem',
  width: '12rem',
  color: 'white',
  padding: '2rem',
  margin: '0.5rem',
  textAlign: 'center',
  float: 'left'
};

const Dustbin = createClass({
  propTypes: {
    accepts: PropTypes.arrayOf(PropTypes.string).isRequired,
    isOver: PropTypes.bool.isRequired,
    canDrop: PropTypes.bool.isRequired,
    attachDropTarget: PropTypes.func.isRequired,
    lastDroppedItem: PropTypes.object,
    onDrop: PropTypes.func.isRequired
  },

  render() {
    const { accepts, isOver, canDrop, attachDropTarget, lastDroppedItem } = this.props;
    const isActive = isOver && canDrop;

    let backgroundColor = '#222';
    if (isActive) {
      backgroundColor = 'darkgreen';
    } else if (canDrop) {
      backgroundColor = 'darkkhaki';
    }

    return (
      <div ref={attachDropTarget}
           style={{ ...style, backgroundColor }}>

        {isActive ?
          'Release to drop' :
          'This dustbin accepts: ' + accepts.join(', ')
        }

        {lastDroppedItem &&
          <p>Last dropped: {JSON.stringify(lastDroppedItem)}</p>
        }
      </div>
    );
  }
});

function createDustbinTarget(props) {
  return {
    drop(monitor) {
      props.onDrop(monitor.getItem());
    }
  };
}

function registerHandlers(props, register) {
  return {
    dustbinTarget: register.dropTarget(props.accepts, createDustbinTarget(props))
  };
}

function pickProps(attach, monitor, handlers) {
  return {
    isOver: monitor.isOver(handlers.dustbinTarget),
    canDrop: monitor.canDrop(handlers.dustbinTarget),
    attachDropTarget: ref => attach(handlers.dustbinTarget, ref)
  };
}

export default configureDragDrop(Dustbin, registerHandlers, pickProps);
