import React from "react";
import ReactDOM from "react-dom";

// const originalCreateElement = React.createElement;

// function createElement() {
//   Array.from(arguments).forEach((it, index) => {
//     console.log(index + ":  ");
//     console.log(it);
//   });
//   return originalCreateElement.apply(this, arguments);
// }

// React.createElement = createElement;

class MyApp extends React.Component {
  constructor() {
    super();
    this.state = {
      count: 0,
    };
  }

  render() {
    return (
      <div>
        <h1>hello world</h1>
        <p onClick={() => this.setState({ count: this.state.count + 1 })}>
          count: {1}
        </p>
      </div>
    );
  }
}

console.log(
  <div>
    <span>2</span>
  </div>
);

ReactDOM.render(<div>1</div>, document.getElementById("root"));
