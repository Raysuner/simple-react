import { emitUpdateForHooks } from "./react-dom"

const stateList = []
let hookIndex = 0

export function resetHookIndex() {
  hookIndex = 0
}

export function useState(initialValue) {
  const localIndex = hookIndex
  stateList[localIndex] = stateList[localIndex] ?? initialValue

  const setState = (newState) => {
    stateList[localIndex] = newState
    resetHookIndex()
    emitUpdateForHooks()
  }

  hookIndex++
  return [stateList[localIndex], setState]
}

export function useReducer(reducer, initialState) {
  const localIndex = hookIndex
  stateList[localIndex] = stateList[localIndex] ?? initialState

  const dispatch = (action) => {
    stateList[localIndex] = reducer(stateList[localIndex], action)
    resetHookIndex()
    emitUpdateForHooks()
  }

  hookIndex++
  return [stateList[localIndex], dispatch]
}

export function useImperativeHandle(ref, createHandle, deps = []) {
  const localIndex = hookIndex

  if (!stateList[localIndex]) {
    // 首次调用，初始化
    ref.current = createHandle()
    stateList[localIndex] = { deps }
  } else {
    // 后续调用，检查依赖是否变化
    const { deps: oldDeps } = stateList[localIndex]

    // 比较依赖：长度不同或任意元素不同
    const depsChanged =
      oldDeps.length !== deps.length ||
      oldDeps.some((dep, i) => dep !== deps[i])

    if (depsChanged) {
      // 依赖变化，重新创建 handle
      ref.current = createHandle()
      stateList[localIndex] = { deps }
    }
  }

  hookIndex++
}