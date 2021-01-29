import React from 'react';
import ReactDOM from 'react-dom';
import App from 'components/App';
import AppContext from 'utils/AppContext';
import registerServiceWorker from './registerServiceWorker';
import 'styles/index.scss';

const { Provider } = AppContext;
const renderedApp = (
    <Provider>
        <App />
    </Provider>
);
const rootDiv = document.getElementById('root');

ReactDOM.render(
    renderedApp,
    rootDiv
);

registerServiceWorker();

// hot reloading
if (process.env.NODE_ENV !== 'production' && module.hot) {
    console.log('hot reloading active');
    module.hot.accept('components/App', () => {
        const NextApp = require('components/App').default;
        ReactDOM.render(
            <NextApp />,
            rootDiv
        )
    })
}
