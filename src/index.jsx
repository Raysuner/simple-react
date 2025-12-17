import React from "./react";
import ReactDOM from "./react-dom";
import { useState } from "./hooks";

class MyApp extends React.Component {
  constructor() {
    super();
    this.arr1 = ['a', 'b', 'c', 'd', 'e'];
    this.arr2 = ['e', 'b', 'c', 'f', 'a']
    this.state = {arr: this.arr1}
    this.flag = true
    this.updateArray = this.updateArray.bind(this);
  }

  updateArray() {
    this.setState({ arr: this.flag ? this.arr2 : this.arr1} )
    this.flag = !this.flag
  }

  render() {
    return (
      <div className="my-app-wrapper">
        <button onClick={this.updateArray}>Update Array</button>
        <ul>
          {this.state.arr.map((item, index) => <li key={item}>{item}</li>)}
        </ul>

      </div>
    );
  }
}

function App() {
  const [count, setCount] = useState(0);
  const [doubleCount, setDoubleCount] = useState(0);
  return (
    <div className="app-wrapper">
      <button onClick={() => {
        setCount(count + 1)
        setDoubleCount(doubleCount + 2)
      }}>点我</button>
      {count}
      <br />
      {doubleCount}
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
