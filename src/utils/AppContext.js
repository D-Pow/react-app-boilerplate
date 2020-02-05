import ContextFactory from 'utils/ContextFactory';

export const AppContextFields = {
    REQUESTED: 'imagesRequested',
    LOADED: 'imagesLoaded'
};
const initialState = {
    [AppContextFields.REQUESTED]: 0,
    [AppContextFields.LOADED]: 0,
};
const AppContext = ContextFactory(initialState);

export default AppContext;
