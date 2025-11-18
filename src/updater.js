import { updateQueue } from "./update-queue";

export class Updater {
  constructor(component) {
    this.component = component;
    this.pendingStates = [];
  }

  launchUpdate() {
    const { component, pendingStates } = this;
    this.component.state = pendingStates.reduce((acc, cur) => {
      if (typeof cur === "function") {
        cur = cur(acc);
      }
      return { ...acc, ...cur };
    }, component.state);
    component.update();
  }

  enqueueState(partialState) {
    this.pendingStates.push(partialState);
    this.preHandler();
  }

  preHandler() {
    if (updateQueue.isBatchingUpdates) {
      updateQueue.queue.add(this);
    } else {
      this.launchUpdate();
    }
  }
}
