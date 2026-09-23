import { useTranslation } from '../../hooks/useTranslation';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const LanguageSwitcher = ({ className = '' }: LanguageSwitcherProps) => {
  const { language, toggleLanguage } = useTranslation();

  const isBn = language === 'bn';

  return (
    <button
      onClick={toggleLanguage}
      type="button"
      title={isBn ? 'Switch to English' : 'বাংলায় দেখুন'}
      aria-label={isBn ? 'Switch to English language' : 'Switch to Bengali language'}
      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 select-none shadow-sm cursor-pointer border hover:scale-105 active:scale-95 ${
        isBn
          ? 'bg-[#EEF2F6] hover:bg-[#E2E8F0] dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200'
          : 'bg-[#EBF3FF] hover:bg-[#DCEBFF] dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border-blue-200/80 dark:border-blue-800 text-blue-900 dark:text-blue-200'
      } ${className}`}
    >
      {isBn ? (
        <>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">GB</span>
          <span className="text-xs font-black text-slate-900 dark:text-white tracking-wide">EN</span>
        </>
      ) : (
        <>
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">BD</span>
          <span className="text-xs font-black text-slate-900 dark:text-white tracking-wide">বাং</span>
        </>
      )}
    </button>
  );
};

export default LanguageSwitcher;
