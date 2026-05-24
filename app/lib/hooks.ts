import { useCallback, useEffect, useRef } from "react";

export function useDebounce<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delay: number,
): (...args: TArgs) => void {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Keeps callbackRef current after every render without invalidating the returned function
  useEffect(() => {
    callbackRef.current = callback;
  });

  // Cancel any pending timer on unmount
  useEffect(() => () => clearTimeout(timerRef.current!), []);

  return useCallback(
    (...args: TArgs) => {
      clearTimeout(timerRef.current!);
      timerRef.current = setTimeout(() => callbackRef.current(...args), delay);
    },
    [delay],
  );
}
