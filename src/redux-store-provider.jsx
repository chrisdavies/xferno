import { Component } from 'inferno';

/**
 * Provide the Redux store to any children via inferno context.store.
 * @constructor
 * @param {{ store: ReduxStore, children: any }} props - The component props should contain the store.
 * @param {*} ctx The existing Inferno context, if any (currently ignored).
 */
export class ReduxStoreProvider extends Component {
  constructor(props, ctx) {
    super(props, ctx);
    this.childContext = { store: props.store };
  }

  getChildContext() {
    return this.childContext;
  }

  render() {
    return this.props.children;
  }
}
