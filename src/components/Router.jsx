import React from 'react';
import PropTypes from 'prop-types';
import { BrowserRouter as ReactRouter, Route, Redirect } from 'react-router-dom';

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

/** @type {Routes} */
export const appRoutes = [
    {
        path: '/',
        render: () => <Redirect to="/home" />,
        exact: true,
    },
    {
        path: '/home',
        component: Home,
        exact: true,
    },
    {
        path: '/about',
        component: About,
        exact: true,
    },
    {
        path: '/animeSearch',
        component: AnimeSearch,
        exact: true,
    },
];


/**
 * Router for automatically rendering `<Route>` entries in a react-router nested in `<React.Suspense>`.
 *
 * @param {Object} props
 * @param {Routes} props.routes - Props used to create `<Route>` entries; Allows child components to specify nested routes themselves (e.g. REST URLs).
 * @param {Object} [props.suspenseProps={fallback: Spinner}] - Fallback used in `<React.Suspense>`.
 * @param {Object} [props.wrapperProps] - Props to pass to the `<div>` inside `<React.Suspense>` that wraps the router.
 * @returns {JSX.Element} - React.Suspense > div > Router > Route[].
 */
function Router({
    suspenseProps = {
        fallback: (<SpinnerCircle show={true} />),
    },
    wrapperProps = {},
    routes,
} = {}) {
    return (
        <React.Suspense {...suspenseProps}>
            <div {...wrapperProps}>
                <ReactRouter>
                    <>
                        {routes.map(routeProps => (
                            <Route key={routeProps.path} {...routeProps} />
                        ))}
                    </>
                </ReactRouter>
            </div>
        </React.Suspense>
    );
}

Router.propTypes = {
    routes: PropTypes.arrayOf(PropTypes.object).isRequired,
    suspenseProps: PropTypes.shape({ fallback: PropTypes.node }),
    wrapperProps: PropTypes.object,
};

export default Router;
