import React from "./react";
import ReactDOM from "./react-dom";

class MyApp extends React.Component {
  constructor() {
    super();
    this.arr1 = ['a', 'b', 'c', 'd', 'e'];
    this.arr2 = ['c', 'b', 'e', 'f', 'a']
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
      <div>
        <button onClick={this.updateArray}>Update Array</button>
        <ul>
          {this.state.arr.map((item, index) => <li key={index}>{item}</li>)}
        </ul>

      </div>
    );
  }
}

ReactDOM.render(<MyApp />, document.getElementById("root"));
