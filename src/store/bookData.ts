import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { EpubData } from "../Types/EpubDataTypes";

const initialState: EpubData[] = [];

const bookData = createSlice({
    name: 'bookData',
    initialState: initialState,
    reducers: {
        addBook(state, action: PayloadAction<EpubData>) {
            state.push(action.payload);
        },
        clearBookState(state) {
            state = initialState;
        }
    }
});

export const { addBook, clearBookState } = bookData.actions;

export default bookData.reducer;