import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Row } from 'react-bootstrap';
import KeyBinding from 'react-keybinding-component';
import { withRouter } from 'react-router';
import { connect } from 'react-redux';
import classnames from 'classnames';

import Header from './Header/Header.react';
import Footer from './Footer/Footer.react';
import Toasts from './Toasts/Toasts.react';

import AppActions from '../actions/AppActions';

import { config } from '../lib/app';


/*
|--------------------------------------------------------------------------
| The App
|--------------------------------------------------------------------------
*/

class Museeks extends Component {
  static propTypes = {
    toasts: PropTypes.array,
    children: PropTypes.object,
  }

  constructor(props) {
    super(props);

    this.onKey = this.onKey.bind(this);
  }

  componentDidMount() {
    AppActions.init();
  }

  onKey(e) {
    switch(e.keyCode) {
      case 32:
        e.preventDefault();
        e.stopPropagation();
        AppActions.player.playToggle();
        break;
    }
  }

  render() {
    const { toasts } = this.props;

    const mainClasses = classnames('main', {
      'native-frame': config.get('useNativeFrame'),
    });

    return (
      <div className={mainClasses}>
        <KeyBinding onKey={this.onKey} preventInputConflict />
        <Header />
        <div className='main-content container-fluid'>
          <Row className='content'>
            {this.props.children}
          </Row>
        </div>
        <Footer />
        <Toasts toasts={toasts} />
      </div>
    );
  }
}

function mapStateToProps(state) {
  return { toasts: state.toasts };
}

export default withRouter(connect(mapStateToProps)(Museeks));
