import { createRoot } from 'react-dom/client';

import AppWithProvider from '@/components/App';
import registerServiceWorker from '@/registerServiceWorker';
import '@/styles/index.scss';


/**
 * React v18 distinguishes between client-side and server-side rendering.
 *
 * @see [Guide on upgrading to v18]{@link https://reactjs.org/blog/2022/03/08/react-18-upgrade-guide.html#updates-to-client-rendering-apis}
 */
const rootDiv = document.getElementById('root');
const reactRoot = createRoot(rootDiv);

reactRoot.render(<AppWithProvider />);

registerServiceWorker();

if (process.env.NODE_ENV !== 'production' && module.hot) {
    console.log('hot reloading active');
    module.hot.accept('@/components/App', () => {
        reactRoot.render(<AppWithProvider />);
    });
}
