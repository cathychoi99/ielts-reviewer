import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: '材料库', end: true },
  { to: '/extractions', label: '摘录本', end: false },
  { to: '/review', label: '复习模式', end: false },
  { to: '/settings', label: '设置', end: false },
] as const;

export default function NavBar() {
  return (
    <>
      {/* Desktop top navbar */}
      <nav className="hidden md:flex items-center border-b border-border bg-page px-8 h-14">
        <span className="font-serif text-lg text-navy mr-8 tracking-wide">
          IELTS Reviewer
        </span>
        <div className="flex items-center h-full">
          {NAV_ITEMS.map((item, i) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'font-mono text-xs uppercase tracking-[2px] font-medium px-5 h-full flex items-center transition-colors',
                  isActive
                    ? 'text-dark border-b-2 border-dark'
                    : 'text-text-tertiary hover:text-text-primary',
                  i > 0 ? '' : '',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-page border-t border-border flex">
        {NAV_ITEMS.map((item, i) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                'flex-1 flex items-center justify-center py-3 font-mono text-[10px] uppercase tracking-[1.5px] font-medium transition-colors',
                isActive ? 'text-dark bg-dark/5' : 'text-text-tertiary',
                i > 0 ? '' : '',
              ].join(' ')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
