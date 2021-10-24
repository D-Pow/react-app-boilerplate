import { useContext } from 'react';

import Router, { appRoutes } from '@/components/Router';
import IncompatibleBrowserFallback from '@/components/IncompatibleBrowserFallback';
import AppContext from '@/utils/AppContext';
import { isMicrosoftBrowser } from '@/utils/BrowserIdentification';

// TODO find a good polyfill for:
//  - Positive/negative look-ahead/-behind regex (not supported on IE)
//  - Proxy
//  - Reflect (?)
const blockInternetExplorer = true;

function App() {
    const { contextState, setContextState } = useContext(AppContext.Context);

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

export default App;
