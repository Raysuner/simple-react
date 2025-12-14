import { REACT_ELEMENT, REACT_FORWARD_REF, REACT_NULL, REACT_TEXT } from "./const";
import { addEvent } from "./add-event";

function setPropsForDom(dom, props) {
  Object.keys(props).forEach((key) => {
    if (key === "children") return;
    else if (key === "className") {
      dom.setAttribute("class", props[key]);
      return;
    } else if (key === "style") {
      Object.keys(props[key]).forEach((styleKey) => {
        dom.style[styleKey] = props[key][styleKey];
      });
    } else if (key === "dangerouslySetInnerHTML") {
      dom.innerHTML = props[key].__html;
    } else if (key === "tabIndex") {
      dom.setAttribute("tabindex", props[key]);
    } else if (key === "htmlFor") {
      dom.setAttribute("for", props[key]);
    } else if (/^on(.*)/.exec(key)) {
      addEvent(dom, key.toLowerCase(), props[key]);
    } else {
      dom[key] = props[key];
    }
  });
}

export function createDOM(vNode) {
  const { type, $$typeof } = vNode;
  if ($$typeof === REACT_NULL) {
    return;
  }
  if ($$typeof === REACT_TEXT) {
    return getDomFromTextComponent(vNode);
  }
  if (typeof type === "string" && $$typeof === REACT_ELEMENT) {
    return getDomFromHostComponent(vNode);
  } else if (type?.$$typeof === REACT_FORWARD_REF) {
    return getDomFromForwardRefComponent(vNode);
  } else if (
    typeof type === "function" &&
    $$typeof === REACT_ELEMENT &&
    type.IS_REACT_CLASS_COMPONENT
  ) {
    return getDomFromClassComponent(vNode);
  } else if (
    typeof type === "function" &&
    $$typeof === REACT_ELEMENT &&
    !type.IS_REACT_CLASS_COMPONENT
  ) {
    return getDomFromFunctionComponent(vNode);
  }
}

function getDomFromForwardRefComponent(vNode) {
  const { type, props, ref } = vNode;
  const { render } = type;
  const childVNode = render(props, ref);
  if (!childVNode) return;
  const dom = createDOM(childVNode);
  if (ref) ref.current = dom;
  return dom;
}

function getDomFromTextComponent(vNode) {
  const dom = document.createTextNode(String(vNode.props.text));
  vNode.dom = dom;
  return dom
}

function getDomFromHostComponent(vNode) {
  const { type, props, ref } = vNode;

  const dom = document.createElement(type);

  const children = normalizeChildren(props.children);
  children.forEach((child, index) => {
    child.index = index;
    mount(child, dom);
  });

  if (ref) ref.current = dom;
  vNode.dom = dom;
  setPropsForDom(dom, props);
  return dom;
}

function getDomFromClassComponent(vNode) {
  const { type, props, ref } = vNode;
  const component = new type(props);
  vNode.component = component;
  if (ref) ref.current = component;
  const renderVNode = component.render();
  component.oldRenderVNode = renderVNode;
  if (!renderVNode) return;
  const dom = createDOM(renderVNode);
  component.dom = dom;
  return dom;
}

function getDomFromFunctionComponent(vNode) {
  const { type, props } = vNode;
  const renderVNode = type(props);
  vNode.oldRenderVNode = renderVNode;
  if (!renderVNode) return;
  const dom = createDOM(renderVNode);
  vNode.dom = dom;
  return dom;
}

function updateClassComponent(oldVNode, newVNode) {
  const classInstance = oldVNode.component;
  classInstance.props = newVNode.props;
  classInstance.launchUpdate();
}

function updateFunctionComponent(oldVNode, newVNode) {
  const oldRenderVNode = oldVNode.oldRenderVNode;
  const { type, props } = newVNode;
  const renderVNode = type(props);
  newVNode.oldRenderVNode = renderVNode;
  const container = oldVNode.dom.parentNode;
  updateDomTree(oldRenderVNode, renderVNode, container);
}

// 将 children 标准化为数组
function normalizeChildren(children) {
  if (children == null || typeof children === "boolean") {
    return [];
  }
  if (!Array.isArray(children)) {
    return [children];
  }
  return children.flat();
}

function updateChildren(oldChildren, newChildren, parentDOM) {
  const oldVNodeChildren = normalizeChildren(oldChildren);
  const newVNodeChildren = normalizeChildren(newChildren);

  let lastNotChangedIndex = -1;
  let oldKeyChildMap = {};
  oldVNodeChildren.forEach((oldVNode, index) => {
    let oldKey = oldVNode && oldVNode.key ? oldVNode.key : index;
    oldKeyChildMap[oldKey] = oldVNode;
  });

  // 遍历新的子虚拟DOM树组，找到可以复用但需要移动的、需要重新创建的、需要删除的节点，剩下的都是不用动的节点
  let actions = [];
  newVNodeChildren.forEach((newVNode, index) => {
    if (typeof newVNode !== 'string') {
      newVNode.index = index;
    }
    let newKey = newVNode.key ? newVNode.key : index;
    let oldVNode = oldKeyChildMap[newKey];
    if (oldVNode) {
      updateDomTree(oldVNode, newVNode, oldVNode.dom);
      if (oldVNode.index < lastNotChangedIndex) {
        actions.push({
          type: 'MOVE',
          oldVNode,
          newVNode,
          index
        });
      }
      delete oldKeyChildMap[newKey]
      lastNotChangedIndex = Math.max(lastNotChangedIndex, oldVNode.index);
    } else {
      actions.push({
        type: 'CREATE',
        newVNode,
        index
      });
    }
  });

  // 可以复用但需要移动位置的节点，以及用不上需要删除的节点，都从父节点上移除
  let VNodeToMove = actions.filter(action => action.type === 'MOVE').map(action => action.oldVNode);
  let VNodeToDelete = Object.values(oldKeyChildMap)
  VNodeToMove.concat(VNodeToDelete).forEach(oldVChild => {
    let currentDOM = oldVChild.dom;
    currentDOM.remove();
  });

  // 对需要移动以及需要新创建的节点统一插入到正确的位置
  actions.forEach(action => {
    let { type, oldVNode, newVNode, index } = action;
    let childNodes = parentDOM.childNodes;
    const getDomForInsert = () => {
      if (type === 'CREATE') {
        return createDOM(newVNode)
      }
      if (type === 'MOVE') {
        return oldVNode.dom
      }
    }
    let childNode = childNodes[index];
    if (childNode) {
      parentDOM.insertBefore(getDomForInsert(), childNode)
    } else {
      parentDOM.appendChild(getDomForInsert());
    }
  });
}

/**
 * 递归对比新旧虚拟节点，更新DOM节点
 * @param {*} oldVNode 旧虚拟节点
 * @param {*} newVNode 新虚拟节点
 * @tutorial 通过分析旧的DOM类型，判断需要进行的操作
 */

function deepDOMDiff(oldVNode, newVNode) {
  const domTypeMap = {
    TEXT_COMPONENT: oldVNode.$$typeof === REACT_TEXT && newVNode.$$typeof === REACT_TEXT,
    HOST_COMPONENT: typeof oldVNode.type === "string",
    CLASS_COMPONENT:
      typeof oldVNode.type === "function" &&
      oldVNode.type.IS_REACT_CLASS_COMPONENT,
    FUNCTION_COMPONENT:
      typeof oldVNode.type === "function" &&
      !oldVNode.type.IS_REACT_CLASS_COMPONENT,
  };
  const [type] = Object.keys(domTypeMap).filter((key) => domTypeMap[key]);
  switch (type) {
    case 'TEXT_COMPONENT':
      newVNode.dom = oldVNode.dom;
      newVNode.dom.textContent = newVNode.props.text;
      break;
    case "HOST_COMPONENT":
      // 更新 DOM 属性
      setPropsForDom(oldVNode.dom, newVNode.props);
      // 传递 dom 引用
      newVNode.dom = oldVNode.dom;
      // 更新子节点
      updateChildren(oldVNode.props.children, newVNode.props.children, oldVNode.dom);
      break;
    case "CLASS_COMPONENT":
      updateClassComponent(oldVNode, newVNode);
      break;
    case "FUNCTION_COMPONENT":
      updateFunctionComponent(oldVNode, newVNode);
      break;
    default:
  }
}

export function updateDomTree(oldVNode, newVNode, container) {
  const actionMap = {
    ADD: !oldVNode && newVNode,
    DELETE: oldVNode && !newVNode,
    REPLACE: oldVNode && newVNode && (oldVNode.type !== oldVNode.type || oldVNode.key !== newVNode.key),
    DEEP_RECURSION: oldVNode && newVNode &&
      oldVNode.type === newVNode.type && oldVNode.key === newVNode.key,
  };
  const [action] = Object.keys(actionMap).filter((key) => actionMap[key]);

  switch (action) {
    case "ADD":
      const newDom = createDOM(newVNode);
      if (newDom) {
        container.appendChild(newDom);
      }
      break;
    case "DELETE":
      if (oldVNode.dom) {
        container.removeChild(oldVNode.dom);
      }
      break;
    case "REPLACE":
      const replaceDom = createDOM(newVNode);
      if (oldVNode.dom && replaceDom) {
        container.replaceChild(replaceDom, oldVNode.dom);
      }
      break;
    case "DEEP_RECURSION":
      deepDOMDiff(oldVNode, newVNode);
      break;
    default:
      break;
  }
}

function mount(vNode, container) {
  const dom = createDOM(vNode);
  if (!dom) return;
  container.appendChild(dom);
}

function render(vNode, container) {
  mount(vNode, container);
}

const ReactDOM = {
  render,
};

export default ReactDOM
