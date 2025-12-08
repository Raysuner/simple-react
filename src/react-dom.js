import { REACT_ELEMENT, REACT_FORWARD_REF } from "./const";
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
  if (vNode === null || vNode === undefined || typeof vNode === "boolean") {
    return;
  }

  if (typeof vNode === "string" || typeof vNode === "number") {
    return document.createTextNode(String(vNode));
  }

  const { type, $$typeof } = vNode;

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

function getDomFromHostComponent(vNode) {
  const { type, props, ref } = vNode;

  const dom = document.createElement(type);

  if (Array.isArray(props.children)) {
    props.children.forEach((child, index) => {
      mount({ ...child, index }, dom);
    });
  } else {
    mount(props.children, dom);
  }

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

function updateChildren(oldVNodeChildren, newVNodeChildren, parentDom) {
  const oldKeyMap = oldVNodeChildren.reduce((acc, cur, index) => {
    if (cur && cur.key) {
      cur.index = index;
      acc.set(cur.key, cur);
    }
    return acc;
  }, new Map());

  let lastNotChangeIndex = -1;
  const actionList = [];

  newVNodeChildren.forEach((newVNode, index) => {
    if (!newVNode) return;
    
    newVNode.index = index;
    const oldVNode = oldKeyMap.get(newVNode.key);
    
    if (oldVNode) {
      // 找到匹配的旧节点，进行深度对比
      deepDOMDiff(oldVNode, newVNode);
      newVNode.dom = oldVNode.dom;
      
      if (oldVNode.index < lastNotChangeIndex) {
        // 需要移动
        actionList.push({
          type: "MOVE",
          oldVNode,
          newVNode,
          index,
        });
      }
      oldKeyMap.delete(newVNode.key);
      lastNotChangeIndex = Math.max(lastNotChangeIndex, oldVNode.index);
    } else {
      // 新节点，需要创建
      actionList.push({
        type: "CREATE",
        newVNode,
        index,
      });
    }
  });

  // 收集需要移动和删除的节点
  const toBeMovedVNode = actionList
    .filter((item) => item.type === "MOVE")
    .map((item) => item.oldVNode);
  const toBeDeletedVNode = Array.from(oldKeyMap.values());

  // 先移除需要移动和删除的节点
  toBeMovedVNode.concat(toBeDeletedVNode).forEach((vNode) => {
    if (vNode && vNode.dom && vNode.dom.parentNode) {
      vNode.dom.parentNode.removeChild(vNode.dom);
    }
  });

  // 执行创建和移动操作
  actionList.forEach((item) => {
    const { type, oldVNode, newVNode, index } = item;
    const getDomForInsert = () => {
      if (type === "CREATE") {
        return createDOM(newVNode);
      } else if (type === "MOVE") {
        return oldVNode.dom;
      }
    };
    
    const childNodes = parentDom.childNodes;
    const domToInsert = getDomForInsert();
    
    if (domToInsert) {
      if (childNodes[index]) {
        parentDom.insertBefore(domToInsert, childNodes[index]);
      } else {
        parentDom.appendChild(domToInsert);
      }
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
    case "HOST_COMPONENT":
      // 更新 DOM 属性
      setPropsForDom(oldVNode.dom, newVNode.props);
      // 更新子节点，传递父 DOM 节点
      newVNode.dom = oldVNode.dom;
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

export function updateDomTree(oldVNode, newVNode, container) {
  const actionMap = {
    ADD: !oldVNode && newVNode,
    DELETE: oldVNode && !newVNode,
    REPLACE: oldVNode && newVNode && oldVNode.type !== newVNode.type,
    DEEP_RECURSION: oldVNode && newVNode && oldVNode.type === newVNode.type,
  };
  const [action] = Object.keys(actionMap).filter((key) => actionMap[key]);

  switch (action) {
    case "ADD":
      container.appendChild(createDOM(newVNode));
      break;
    case "DELETE":
      container.removeChild(oldVNode.dom);
      break;
    case "REPLACE":
      container.replaceChild(createDOM(newVNode), oldVNode.dom);
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

export default ReactDOM;
