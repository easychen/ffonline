import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import Login from './screen/Login';
import Test from './screen/Test'; 
import Test2 from './screen/Test2'; 


class App extends Component {
  render() {
    return (
      <Router>
        <Switch>
          <Route path="/t2" component={Test2} />
          <Route path="/" component={Test} />
          <Route path="/Login" component={Login} />
        </Switch>
      </Router>  
    );
  }
}

export default App;
