class UpdateQueue {
  constructor() {
    this.isBatchingUpdates = false;
    this.queue = new Set();
  }

  flush() {
    this.isBatchingUpdates = false;
    this.queue.forEach((updater) => {
      updater.launchUpdate();
    });
    this.queue.clear();
  }
}

export const updateQueue = new UpdateQueue();
