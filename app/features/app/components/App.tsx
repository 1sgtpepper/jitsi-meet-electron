import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';

import type { IState } from '../../../types';
import config from '../../config';
import { addRecentListEntry } from '../../recent-list/actions';
import { setServerURL } from '../../settings/actions';
import { createConferenceObjectFromURL } from '../../utils';
import { Welcome } from '../../welcome';

interface IProps {
    _serverURL?: string;
    dispatch: Dispatch;
}

/**
 * Main component encapsulating the Launcher application.
 */
class App extends Component<IProps> {
    _listeners: Array<() => void> = [];

    /**
     * Initializes a new {@code App} instance.
     *
     * @inheritdoc
     */
    constructor(props: IProps) {
        super(props);

        document.title = config.appName;

        this._listenOnProtocolMessages
            = this._listenOnProtocolMessages.bind(this);
        this._onSetDefaultServer = this._onSetDefaultServer.bind(this);
    }

    /**
     * Implements React's {@link Component#componentDidMount()}.
     *
     * @returns {void}
     */
    componentDidMount() {
        // start listening on this events
        const removeProtocolListener
            = window.jitsiElectronApp.ipc.addListener('protocol-data-msg', this._listenOnProtocolMessages);
        const removeSetDefaultServerListener
            = window.jitsiElectronApp.ipc.addListener('set-default-server', this._onSetDefaultServer);

        if (removeProtocolListener) {
            this._listeners.push(removeProtocolListener);
        }

        if (removeSetDefaultServerListener) {
            this._listeners.push(removeSetDefaultServerListener);
        }

        // send notification to main process
        window.jitsiElectronApp.ipc.send('renderer-ready');
    }

    /**
     * Implements React's {@link Component#componentWillUnmount()}.
     *
     * @returns {void}
     */
    componentWillUnmount() {
        this._listeners.forEach(remove => remove());
    }

    /**
     * Handler for the set-default-server IPC message from the main process.
     *
     * @param {string} serverURL - The default server URL passed via CLI.
     * @returns {void}
     */
    _onSetDefaultServer(serverURL: string) {
        this.props.dispatch(setServerURL(serverURL));
    }


    /**
     * Handler when main process contacts us with a protocol URL.
     * In the two-window architecture, this opens the meeting in Window 2
     * instead of navigating the launcher.
     *
     * @param {string} inputURL - String with room name.
     *
     * @returns {void}
     */
    _listenOnProtocolMessages(inputURL: string) {
        // Remove trailing slash if one exists.
        if (inputURL.slice(-1) === '/') {
            inputURL = inputURL.slice(0, -1); // eslint-disable-line no-param-reassign
        }

        const conference = createConferenceObjectFromURL(
            inputURL,
            this.props._serverURL || config.defaultServerURL
        );

        // Don't navigate if conference couldn't be created
        if (!conference) {
            return;
        }

        this.props.dispatch(addRecentListEntry(conference));

        // Open in the meeting window (Window 2), not in the launcher.
        window.jitsiElectronApp.ipc.send('open-meeting-window', conference);
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        return (
            <Welcome />
        );
    }
}

/**
 * Maps (parts of) the redux state to the React props.
 *
 * @param {Object} state - The redux state.
 * @returns {Object}
 */
function _mapStateToProps(state: IState) {
    return {
        _serverURL: state.settings.serverURL
    };
}

export default connect(_mapStateToProps)(App);
