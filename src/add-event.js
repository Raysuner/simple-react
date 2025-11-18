import { updateQueue } from "./update-queue";

function createSyntheticEvent(nativeEvent) {
  const newSyntheticEvent = {};
  for (let key in nativeEvent) {
    newSyntheticEvent[key] =
      typeof nativeEvent[key] === "function"
        ? nativeEvent[key].bind(nativeEvent)
        : nativeEvent[key];
  }
  return {
    ...newSyntheticEvent,
    nativeEvent,
    isDefaultPrevented: false,
    isPropagationStopped: false,
    stopPropagation: () => {
      this.isPropagationStopped = true;
      if (this.nativeEvent.stopPropagation) {
        this.nativeEvent.stopPropagation();
      } else {
        this.nativeEvent.cancelBubble = true;
      }
    },
    preventDefault() {
      this.isDefaultPrevented = true;
      if (this.nativeEvent.preventDefault) {
        this.nativeEvent.preventDefault();
      } else {
        this.nativeEvent.returnValue = false;
      }
    },
  };
}

function dispatchEvent(nativeEvent) {
  updateQueue.isBatchingUpdates = true;

  let syntheticEvent = createSyntheticEvent(nativeEvent);
  let { target, type } = syntheticEvent;
  while (target) {
    syntheticEvent.currentTarget = target;
    const handler = target.handlerAttach?.[`on${type}`];
    if (handler) {
      handler(syntheticEvent);
    }
    if (syntheticEvent.isPropagationStopped) {
      break;
    }
    target = target.parentNode;
  }

  updateQueue.flush();
}

export function addEvent(dom, eventType, handler) {
  dom.handlerAttach = dom.handlerAttach || {};
  dom.handlerAttach[eventType] = handler;
  if (document[eventType]) return;
  document[eventType] = dispatchEvent;
}
