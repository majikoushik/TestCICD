import { useDispatch, useSelector } from 'react-redux';
import { TypedUseSelectorHook } from 'react-redux';

// Define RootState and AppDispatch types here
// These would typically be imported from your store file in TypeScript
// For JavaScript, we'll use them as placeholders for better DX
export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;
