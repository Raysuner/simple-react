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

export function updateDomTree(oldDom, newDom) {
  oldDom.parentNode.replaceChild(newDom, oldDom);
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
    props.children.forEach((child) => {
      mount(child, dom);
    });
  } else {
    mount(props.children, dom);
  }

  if (ref) ref.current = dom;
  setPropsForDom(dom, props);
  return dom;
}

function getDomFromClassComponent(vNode) {
  const { type, props, ref } = vNode;
  const component = new type(props);
  if (ref) ref.current = component;
  const childVNode = component.render();
  if (!childVNode) return;
  const dom = createDOM(childVNode);

  component.oldDom = dom;
  return dom;
}

function getDomFromFunctionComponent(vNode) {
  const { type, props } = vNode;
  const newVNode = type(props);
  if (!newVNode) return;
  return createDOM(newVNode);
}

export function createDOM(vNode) {
  if (vNode === null || vNode === undefined || typeof vNode === "boolean") {
    return;
  }

  if (typeof vNode === "string" || typeof vNode === "number") {
    return document.createTextNode(String(vNode));
  }

  const { type } = vNode;

  if (typeof type === "string" && type.$$typeof === REACT_ELEMENT) {
    return getDomFromHostComponent(vNode);
  } else if (type?.$$typeof === REACT_FORWARD_REF) {
    return getDomFromForwardRefComponent(vNode);
  } else if (
    typeof type === "function" &&
    type.$$typeof === REACT_ELEMENT &&
    type.IS_REACT_CLASS_COMPONENT
  ) {
    return getDomFromClassComponent(vNode);
  } else if (
    typeof type === "function" &&
    type.$$typeof === REACT_ELEMENT &&
    !type.IS_REACT_CLASS_COMPONENT
  ) {
    return getDomFromFunctionComponent(vNode);
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
