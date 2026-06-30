import { useCallback, useMemo, useRef, useState } from 'react';

const DEFAULT_MAX = 40;

export function useUndoHistory<T>(initial: T, maxSize = DEFAULT_MAX) {
  const [present, setPresent] = useState<T>(initial);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const presentRef = useRef(present);
  presentRef.current = present;

  const reset = useCallback((value: T) => {
    pastRef.current = [];
    futureRef.current = [];
    setPresent(value);
  }, []);

  const push = useCallback(
    (next: T) => {
      pastRef.current.push(structuredClone(presentRef.current));
      if (pastRef.current.length > maxSize) pastRef.current.shift();
      futureRef.current = [];
      setPresent(next);
    },
    [maxSize],
  );

  const undo = useCallback(() => {
    const past = pastRef.current;
    if (!past.length) return false;
    const previous = past.pop()!;
    futureRef.current.push(structuredClone(presentRef.current));
    setPresent(previous);
    return true;
  }, []);

  const redo = useCallback(() => {
    const future = futureRef.current;
    if (!future.length) return false;
    const next = future.pop()!;
    pastRef.current.push(structuredClone(presentRef.current));
    setPresent(next);
    return true;
  }, []);

  return useMemo(
    () => ({
      present,
      setPresent,
      push,
      reset,
      undo,
      redo,
    }),
    [present, setPresent, push, reset, undo, redo],
  );
}
