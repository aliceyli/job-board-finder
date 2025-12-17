import { ReactNode } from 'react';

export interface AppRoute {
  path: string;
  label: string;
  element: ReactNode;
}
