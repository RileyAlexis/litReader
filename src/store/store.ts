import { configureStore, combineReducers } from "@reduxjs/toolkit";
// import logger from 'redux-logger';

import bookData from './bookData';


const allReducers = combineReducers({
    bookData: bookData
});

const storeInstance = configureStore({
    reducer: allReducers,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        })
    // .concat(logger),
});

export { storeInstance };
