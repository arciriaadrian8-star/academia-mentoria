"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** true solo en el navegador (para fechas en la zona horaria del usuario). */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
