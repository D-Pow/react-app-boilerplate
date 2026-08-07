import { useContext } from 'react';

import Router, { appRoutes } from '@/components/Router';
import IncompatibleBrowserFallback from '@/components/IncompatibleBrowserFallback';
import AppContext from '@/utils/AppContext';
import { isMicrosoftBrowser } from '@/utils/BrowserIdentification';

// TODO find a good polyfill for:
//  - Positive/negative look-behind regex (not supported on IE)
//      - No polyfills seem to exist for look-behinds
//      - Starter: https://stackoverflow.com/questions/641407/javascript-negative-lookbehind-equivalent/27213663#27213663
//          - Works because the extra `.{length}` after the look-ahead is effectively the equivalent
//  - Proxy
//  - Reflect (?)
const blockInternetExplorer = !process.env.SUPPORT_IE;

function App() {
    const { contextState, setContextState } = useContext(AppContext);

    if (blockInternetExplorer && isMicrosoftBrowser(false)) {
        return <IncompatibleBrowserFallback />;
    }

    return (
        <Router
            routes={appRoutes}
            wrapperProps={{
                className: 'app text-center',
            }}
        />
    );
}

function AppWithProvider() {
    return (
        <AppContext.Provider>
            <App />
        </AppContext.Provider>
    );
}

export default AppWithProvider;
export { App };
