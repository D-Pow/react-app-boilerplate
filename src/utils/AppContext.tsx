import ContextFactory from '@/utils/ContextFactory';


export const AppContextFields = {
    REQUESTED: 'imagesRequested',
    LOADED: 'imagesLoaded',
};


const initialState = {
    [AppContextFields.REQUESTED]: 0,
    [AppContextFields.LOADED]: 0,
};

export type AppContextState = typeof initialState;

const AppContext = ContextFactory<AppContextState>({
    initialState,
    displayName: 'AppContext',
});


export default AppContext;
