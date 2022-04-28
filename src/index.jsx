import { createRoot } from 'react-dom/client';

import App from '@/components/App';
import AppContext from '@/utils/AppContext';
import registerServiceWorker from '@/registerServiceWorker';
import '@/styles/index.scss';


const renderedApp = (
    <AppContext.Provider>
        <App />
    </AppContext.Provider>
);

/**
 * React v18 distinguishes between client-side and server-side rendering.
 *
 * @see [Guide on upgrading to v18]{@link https://reactjs.org/blog/2022/03/08/react-18-upgrade-guide.html#updates-to-client-rendering-apis}
 */
const rootDiv = document.getElementById('root');
const reactRoot = createRoot(rootDiv);

reactRoot.render(renderedApp);

registerServiceWorker();

if (process.env.NODE_ENV !== 'production' && module.hot) {
    console.log('hot reloading active');
    module.hot.accept('@/components/App', () => {
        reactRoot.render(renderedApp);
    });
}
