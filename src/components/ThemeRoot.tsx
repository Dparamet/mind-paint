import { useMemo, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore } from '../store/useEditorStore';
import { resolveThemePalette, toThemeCssVariables } from '../theme/theme';

export function ThemeRoot({ children }: { children: ReactNode }) {
  const settings = useEditorStore(useShallow((state) => ({
    theme: state.theme,
    customThemePrimary: state.customThemePrimary,
    customThemeOverrides: state.customThemeOverrides,
  })));
  const style = useMemo(
    () => toThemeCssVariables(resolveThemePalette(settings)),
    [settings],
  );

  return (
    <div
      data-testid="theme-root"
      data-theme={settings.theme}
      style={style}
      className="flex h-screen w-screen overflow-hidden bg-paper text-ink"
    >
      {children}
    </div>
  );
}
