import { createDOM, updateDomTree } from "./react-dom";
import { Updater } from "./updater";

export class Component {
  static IS_REACT_CLASS_COMPONENT = true;
  constructor(props) {
    this.props = props;
    this.state = {};
    this.updater = new Updater(this);
  }

  // 更新和合并状态，并且让组件重新渲染
  setState(partialState) {
    this.updater.enqueueState(partialState);
  }

  update() {
    const oldDom = this.oldDom;
    const newVNode = this.render();
    const newDom = createDOM(newVNode);
    updateDomTree(oldDom, newDom);
    this.oldDom = newDom;
  }
}
