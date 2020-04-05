import React, { useContext } from 'react';
import { HashRouter as Router, Route, Redirect } from 'react-router-dom';
import SpinnerCircle from 'components/ui/SpinnerCircle';
import IncompatibleBrowserFallback from 'components/IncompatibleBrowserFallback';
import AppContext from 'utils/AppContext';
import { isMicrosoftBrowser } from 'utils/BrowserIdentification';

/**
 * Lazy-load components so the page spinner is prioritized, loaded quickly, and unblocked from animating.
 * This speeds up the initial page load for the user.
 *
 * Split import() and lazy() calls from each other so that component-loading is initiated immediately
 * instead of waiting to load until they are in view. This has the net effect of allowing the Spinner
 * to load first, but then loading the rest of the components as soon as the Spinner is rendered.
 * If the promise were nested inside the lazy() call instead, then e.g. the About component wouldn't
 * be loaded until the user traverses to /about.
 */

const homeImportPromise = import(/* webpackChunkName: 'Home' */ 'components/Home');
const Home = React.lazy(() => homeImportPromise);

const aboutImportPromise = import(/* webpackChunkName: 'About' */ 'components/About');
const About = React.lazy(() => aboutImportPromise);

const animeSearchImportPromise = import(/* webpackChunkName: 'AnimeSearch' */ 'components/AnimeSearch');
const AnimeSearch = React.lazy(() => animeSearchImportPromise);

const routes = [
    {
        path: '/',
        render: () => <Redirect to="/home" />,
        name: 'Home',
        exact: true
    },
    {
        path: '/home',
        component: Home,
        name: 'Home',
        exact: true
    },
    {
        path: '/about',
        component: About,
        name: 'About'
    },
    {
        path: '/animeSearch',
        component: AnimeSearch,
        name: 'AnimeSearch',
        exact: true
    }
];

const blockMicrosoftBrowsers = false;

function App() {
    const { contextState, setContextState } = useContext(AppContext.Context);

    if (blockMicrosoftBrowsers && isMicrosoftBrowser()) {
        return <IncompatibleBrowserFallback />
    }

    const renderedRoutes = routes.map(routeAria => (
        <Route key={routeAria.path} {...routeAria} />
    ));

    return (
        <React.Suspense
            fallback={<SpinnerCircle show={true} />}
        >
            <div className={'app text-center'}>
                <Router>
                    <React.Fragment>
                        {renderedRoutes}
                    </React.Fragment>
                </Router>
            </div>
        </React.Suspense>
    );
}

export default App;
