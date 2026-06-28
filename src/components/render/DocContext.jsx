import { createContext, useContext } from 'react';

// Carries the current doc's route + whether it gets reading-progress UI,
// so deep render components (headings, checkboxes) can react accordingly.
export const DocContext = createContext({ route: '', tracked: false });

export function useDoc() {
  return useContext(DocContext);
}
