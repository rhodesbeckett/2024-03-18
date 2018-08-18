import types from '../constants/action-types';

import { Toast, Action } from '../typings/interfaces';

export type ToastsState = Toast[];


const initialState: ToastsState = [];

export default (state = initialState, action: Action): ToastsState => {
  switch (action.type) {
    case (types.APP_TOAST_ADD): {
      const toasts = [...state, action.payload];
      return toasts;
    }

    case (types.APP_TOAST_REMOVE): {
      const toasts = [...state].filter(n => n._id !== action.payload.toastId);
      return toasts;
    }

    default: {
      return state;
    }
  }
};
