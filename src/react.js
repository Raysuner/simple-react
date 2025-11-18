import { forwardRefSymbol, reactElementSymbol } from "./const";
import { Component } from "./component";

const exceptKeyList = ["key", "ref", "__self", "__source", "_owner", "_store"];

function createElement(type, properties, ...children) {
  const { ref = null, key = null } = properties || {};
  const props = { children };

  Object.keys(properties).reduce((acc, cur) => {
    if (!exceptKeyList.includes(cur)) {
      acc[cur] = properties[cur];
    }
    return acc;
  }, props);
  return {
    $$typeof: reactElementSymbol,
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
    $$typeof: forwardRefSymbol,
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
