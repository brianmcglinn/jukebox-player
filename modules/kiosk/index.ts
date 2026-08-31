import { requireNativeModule } from 'expo-modules-core';

const Kiosk = requireNativeModule('KioskModule');

export const startKioskMode = (): void => Kiosk.startKioskMode();
export const stopKioskMode = (): void => Kiosk.stopKioskMode();
export const isInKioskMode = (): boolean => Kiosk.isInKioskMode();
