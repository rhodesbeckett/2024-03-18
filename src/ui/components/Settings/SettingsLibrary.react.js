import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ButtonGroup, Button } from 'react-bootstrap';

import Dropzone from '../Shared/Dropzone.react';

import AppActions from '../../actions/AppActions';

const dialog = electron.remote.dialog;


/*
|--------------------------------------------------------------------------
| Child - SettingsLibrary - manage import folders for library
|--------------------------------------------------------------------------
*/

export default class SettingsLibrary extends Component {
  static propTypes = {
    config: PropTypes.object,
    library: PropTypes.object,
  }

  constructor(props) {
    super(props);
  }

  resetLibrary() {
    AppActions.player.stop();
    AppActions.library.reset();
  }

  onDrop(e) {
    const files = [];
    const eventFiles = e.dataTransfer.files;

    for(let i = 0; i < eventFiles.length; i++) {
      files.push(eventFiles[i].path);
    }

    AppActions.library.add(files);
  }

  openFolderSelector() {
    dialog.showOpenDialog({
      properties: ['multiSelections', 'openDirectory'],
    }, (result) => {
      if(result) {
        AppActions.library.add(result);
      }
    });
  }

  render() {
    return (
      <div className='setting settings-musicfolder'>
        <div className='setting-section'>
          <h4>Manage library</h4>
          <Dropzone
            title='Add music to library'
            subtitle='Drop files or folders here'
            onDrop={this.onDrop}
            onClick={this.openFolderSelector}
          />
          <ButtonGroup>
            <Button
              bsSize='small'
              bsStyle={'danger'}
              title='Fully reset the library'
              disabled={this.props.library.refreshing}
              onClick={this.resetLibrary}
            >
                          Reset library
            </Button>
          </ButtonGroup>
        </div>
      </div>
    );
  }
}
