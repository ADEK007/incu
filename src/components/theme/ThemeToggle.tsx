import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

export const ThemeToggle = memo(() => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" aria-hidden />;

  const isDark = resolvedTheme === 'dark';
  const next = isDark ? 'light' : 'dark';

  return (
    <button
      type="button"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={() => setTheme(next)}
      className="relative p-2 rounded-full text-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
    >
      <Sun
        size={20}
        className={`transition-all duration-300 ${isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}
      />
      <Moon
        size={20}
        className={`absolute top-2 left-2 transition-all duration-300 ${isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`}
      />
    </button>
  );
});
ThemeToggle.displayName = 'ThemeToggle';
