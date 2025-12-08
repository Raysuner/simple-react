import { REACT_FORWARD_REF, REACT_ELEMENT } from "./const";
import { Component } from "./component";

const exceptKeyList = ["key", "ref", "__self", "__source", "_owner", "_store"];

function createElement(type, properties, ...children) {
  const { ref = null, key = null } = properties || {};

  let finanChildren;
  if (children.length === 1) {
    finanChildren = children[0];
  } else if (children.length > 1) {
    finanChildren = children;
  } 

  const props = { children: finanChildren };

  Object.keys(properties).reduce((acc, cur) => {
    if (!exceptKeyList.includes(cur)) {
      acc[cur] = properties[cur];
    }
    return acc;
  }, props);

  return {
    $$typeof: REACT_ELEMENT,
    type,
    props,
    ref,
    key,
  };
}

function createRef() {
  return {
    current: null,
  };
}

function forwardRef(render) {
  return {
    $$typeof: REACT_FORWARD_REF,
    render,
  };
}

const React = {
  Component,
  createElement,
  createRef,
  forwardRef,
};

export default React;
