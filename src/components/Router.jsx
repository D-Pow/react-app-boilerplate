import React from 'react';
import PropTypes from 'prop-types';
import {
    BrowserRouter,
    HashRouter,
    Routes,
    Route,
    Navigate,
} from 'react-router-dom';

import SpinnerCircle from '@/components/ui/SpinnerCircle';

/*
 * Lazy-load components so the page spinner is prioritized, loaded quickly, and unblocked from animating.
 * This speeds up the initial page load for the user.
 *
 * Split import() and lazy() calls from each other so that component-loading is initiated immediately
 * instead of waiting to load until they are in view. This has the net effect of allowing the Spinner
 * to load first, but then loading the rest of the components as soon as the Spinner is rendered.
 * If the promise were nested inside the lazy() call instead, then the component's .js file wouldn't be
 * requested until after the user traversed to its `path`.
 */

const homeImportPromise = import(/* webpackChunkName: 'Home' */ '@/components/Home');
const Home = React.lazy(() => homeImportPromise);

const aboutImportPromise = import(/* webpackChunkName: 'About' */ '@/components/About');
const About = React.lazy(() => aboutImportPromise);

const animeSearchImportPromise = import(/* webpackChunkName: 'AnimeSearch' */ '@/components/AnimeSearch');
const AnimeSearch = React.lazy(() => animeSearchImportPromise);


/** @typedef {import('react-router-dom').RouteProps[]} Routes */

/**
 * @type {Routes}
 *
 * @see [Docs on Route with(out) nested Route children]{@link https://reactrouter.com/docs/en/v6/api#routes-and-route}
 * @see [react-router v5 docs]{@link https://github.com/remix-run/react-router/tree/v5.3.1/packages/react-router/docs/api}
 * @see [Upgrading from v5 to v6]{@link https://gist.github.com/mjackson/b5748add2795ce7448a366ae8f8ae3bb}
 */
export const appRoutes = [
    {
        path: '/',
        element: <Navigate to="/home" />,
    },
    {
        path: '/home',
        element: <Home />,
    },
    {
        path: '/about',
        element: <About />,
    },
    {
        path: '/animeSearch',
        element: <AnimeSearch />,
    },
];


/**
 * Router for automatically rendering `<Route>` entries in a react-router nested in `<React.Suspense>`.
 *
 * @param {Object} props
 * @param {Routes} props.routes - Props used to create `<Route>` entries; Allows child components to specify nested routes themselves (e.g. REST URLs).
 * @param {React.ComponentType} [props.ReactRouter=Router.Types.SLASH] - Type of router to use.
 * @param {Object} [props.routerProps] - Props for the selected `ReactRouter`.
 * @param {React.ComponentType} [props.RouterWrapper=div] - Container to wrap the first child of {@code <React.Suspense />} in before rendering {@code <Router />}.
 * @param {Object} [props.wrapperProps] - Props to pass to the `<div>` inside `<React.Suspense>` that wraps the router.
 * @param {Object} [props.suspenseProps={fallback: Spinner}] - Fallback used in `<React.Suspense>`.
 * @returns {JSX.Element} - React.Suspense > div > Router > Route[].
 */
function Router({
    routes,
    ReactRouter = Router.Types.SLASH,
    routerProps = {},
    RouterWrapper = 'div',
    wrapperProps = {},
    suspenseProps = {
        fallback: (<SpinnerCircle show />),
    },
    children,
}) {
    return (
        <React.Suspense {...suspenseProps}>
            <RouterWrapper {...wrapperProps}>
                <ReactRouter {...routerProps}>
                    <Routes>
                        {routes.map(routeProps => (
                            <Route key={routeProps.path} {...routeProps}  />
                        ))}
                    </Routes>
                    {children}
                </ReactRouter>
            </RouterWrapper>
        </React.Suspense>
    );
}

Router.Types = {
    SLASH: BrowserRouter,
    HASH: HashRouter,
};

Router.propTypes = {
    routes: PropTypes.arrayOf(PropTypes.object).isRequired,
    ReactRouter: PropTypes.elementType,
    routerProps: PropTypes.object,
    RouterWrapper: PropTypes.elementType,
    wrapperProps: PropTypes.object,
    suspenseProps: PropTypes.shape({ fallback: PropTypes.node }),
    children: PropTypes.node,
};

export default Router;
