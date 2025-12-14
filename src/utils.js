import { REACT_NULL, REACT_TEXT } from "./const"

export function toVNode(node) {

  if (node == null || typeof node === 'boolean') {
    return { $$typeof: REACT_NULL }
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return {
      $$typeof: REACT_TEXT,
      props: { text: node }
    }
  }
  return node
}