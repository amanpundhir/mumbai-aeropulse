import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  CloudSun,
  LayoutGrid,
  LineChart,
  Map as MapIcon,
  Megaphone,
  Menu,
  Radio,
  X,
} from 'lucide-react';
import { StationData } from '../types/aqi';
import { bandFor, cn } from '../lib/aqi-utils';

export interface ServiceStatus {
  name: string;
  live: boolean;
  liveLabel: string;
  fallbackLabel: string;
  detail?: string;
}

export const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'advisory', label: 'Advisory', icon: Megaphone },
  { id: 'forecast', label: 'Forecast', icon: LineChart },
  { id: 'weather', label: 'Weather', icon: CloudSun },
  { id: 'regional', label: 'Google readings', icon: Radio },
] as const;

/** Tracks which section is in view, so the sidebar can mark it. */
export function useActiveSection(ids: readonly string[]): string {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!els.length || typeof IntersectionObserver === 'undefined') return;
    const seen = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
        const best = [...seen.entries()].sort((a, b) => b[1] - a[1])[0];
        if (best && best[1] > 0) setActive(best[0]);
      },
      { rootMargin: '-72px 0px -40% 0px', threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);
  return active;
}

const Logo: React.FC<{ tone?: 'dark' | 'light' }> = ({ tone = 'dark' }) => (
  <a href={import.meta.env.BASE_URL} className="group flex shrink-0 items-center gap-2.5" aria-label="Mumbai AeroPulse home">
    <span
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-lg font-display text-[15px] font-semibold',
        'bg-sage text-shell'
      )}
      aria-hidden
    >
      A
    </span>
    <span
      className={cn(
        'font-display text-[15px] font-medium tracking-[-0.01em]',
        tone === 'dark' ? 'text-shell-ink' : 'text-ink'
      )}
    >
      Mumbai AeroPulse
    </span>
  </a>
);

const StationList: React.FC<{
  stations: StationData[];
  activeStationId: string;
  onSelectStation: (id: string) => void;
}> = ({ stations, activeStationId, onSelectStation }) => {
  const sorted = [...stations].sort((a, b) => (b.latest?.pm25 ?? 0) - (a.latest?.pm25 ?? 0));
  return (
    <div role="radiogroup" aria-label="Station" className="space-y-0.5">
      {sorted.map((st) => {
        const id = String(st.stationId || st.id);
        const selected = id === String(activeStationId);
        const band = bandFor(st.latest?.pm25);
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelectStation(id)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors duration-150',
              selected ? 'bg-shell-3 text-shell-ink' : 'text-shell-muted hover:bg-shell-2 hover:text-shell-ink'
            )}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: band.solid }} aria-hidden />
            <span className="min-w-0 flex-1 truncate font-medium">{st.name}</span>
            <span className="num font-mono text-xs">{st.latest?.pm25 != null ? st.latest.pm25.toFixed(0) : '–'}</span>
            <span className="sr-only">micrograms per cubic metre, {band.category}</span>
          </button>
        );
      })}
    </div>
  );
};

const SourcesMenu: React.FC<{ services: ServiceStatus[]; align?: 'left' | 'right'; tone?: 'dark' | 'light' }> = ({
  services,
  align = 'right',
  tone = 'light',
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const liveCount = services.filter((s) => s.live).length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className={cn(
          tone === 'light'
            ? 'btn'
            : 'flex h-9 w-full items-center gap-2 rounded-lg border border-shell-line px-2.5 text-[13px] text-shell-muted transition-colors duration-150 hover:bg-shell-2 hover:text-shell-ink'
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={cn('h-2 w-2 rounded-full', liveCount > 0 ? 'bg-[#4caf50]' : 'bg-[#9a9b96]')} aria-hidden />
        <span className="flex-1 text-left">
          Data sources
          <span className={cn('ml-1.5', tone === 'light' ? 'text-ink-3' : 'text-shell-muted')}>
            {liveCount}/{services.length} live
          </span>
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-150', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Data sources"
          className={cn(
            'absolute z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-4 text-ink shadow-pop',
            tone === 'light' ? 'top-full mt-2' : 'bottom-full mb-2',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          <p className="text-[13px] font-semibold text-ink">Data sources</p>
          <p className="mt-1 text-xs leading-[18px] text-ink-2">
            Station readings and forecasts are bundled with the site. Three Google services are optional.
          </p>
          <ul className="mt-3 divide-y divide-line-soft border-y border-line-soft">
            {services.map((s) => (
              <li key={s.name} className="flex items-start justify-between gap-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink">{s.name}</p>
                  {s.detail && <p className="mt-0.5 text-xs leading-[18px] text-ink-2">{s.detail}</p>}
                </div>
                <span
                  className={cn(
                    'mt-0.5 inline-flex shrink-0 items-center gap-1.5 text-xs font-medium',
                    s.live ? 'text-[#8fd39b]' : 'text-ink-2'
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', s.live ? 'bg-[#4caf50]' : 'bg-ink-3')} aria-hidden />
                  {s.live ? s.liveLabel : s.fallbackLabel}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-[18px] text-ink-2">
            To turn on live services, add keys to <code className="rounded bg-ground px-1 py-0.5 text-[11px]">dashboard/.env</code>{' '}
            and restart. See <code className="rounded bg-ground px-1 py-0.5 text-[11px]">.env.example</code>.
          </p>
        </div>
      )}
    </div>
  );
};

interface ShellProps {
  stations: StationData[];
  activeStationId: string;
  onSelectStation: (id: string) => void;
  services: ServiceStatus[];
  snapshotLabel: string;
}

/** The dark left rail on large screens: the product, its sections and the four stations. */
export const Sidebar: React.FC<ShellProps & { activeSection: string }> = ({
  stations,
  activeStationId,
  onSelectStation,
  services,
  activeSection,
}) => (
  <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-shell-line bg-shell lg:flex" aria-label="Dashboard">
    <div className="flex h-16 items-center border-b border-shell-line px-5">
      <Logo />
    </div>

    <nav aria-label="Sections" className="px-3 pt-4">
      <p className="px-2.5 pb-1.5 text-[11px] font-medium text-shell-muted">Dashboard</p>
      <ul className="space-y-0.5">
        {NAV.map(({ id, label, icon: Icon }) => {
          const current = activeSection === id;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={current ? 'true' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors duration-150',
                  current ? 'bg-shell-3 text-shell-ink' : 'text-shell-muted hover:bg-shell-2 hover:text-shell-ink'
                )}
              >
                <Icon className={cn('h-4 w-4', current ? 'text-sage' : '')} strokeWidth={1.75} aria-hidden />
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>

    <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-3">
      <p className="flex items-center justify-between px-2.5 pb-1.5 text-[11px] font-medium text-shell-muted">
        <span>Stations</span>
        <span>µg/m³</span>
      </p>
      <StationList stations={stations} activeStationId={activeStationId} onSelectStation={onSelectStation} />
    </div>

    <div className="space-y-2 border-t border-shell-line p-3">
      <SourcesMenu services={services} align="left" tone="dark" />
      <a
        href={import.meta.env.BASE_URL}
        className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-[13px] text-shell-muted transition-colors duration-150 hover:bg-shell-2 hover:text-shell-ink"
      >
        <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        About AeroPulse
      </a>
    </div>
  </aside>
);

/** The bar over the content: where you are, the snapshot time and, below lg, the menu and station tabs. */
export const Topbar: React.FC<ShellProps & { stationName: string; activeSection: string }> = ({
  stations,
  activeStationId,
  onSelectStation,
  services,
  snapshotLabel,
  stationName,
  activeSection,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const section = NAV.find((n) => n.id === activeSection) ?? NAV[0];

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ground/90 backdrop-blur supports-[backdrop-filter]:bg-ground/80">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="lg:hidden">
          <Logo tone="light" />
        </div>
        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-[13px] lg:flex">
          <span className="text-ink-3">Stations</span>
          <span className="text-ink-3" aria-hidden>
            /
          </span>
          <span className="truncate font-medium text-ink">{stationName}</span>
          <span className="text-ink-3" aria-hidden>
            /
          </span>
          <span className="text-ink-2">{section.label}</span>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-2 md:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-sage" aria-hidden />
            {snapshotLabel}
          </span>
          <div className="lg:hidden">
            <SourcesMenu services={services} />
          </div>
          <button
            type="button"
            className="btn h-9 w-9 px-0 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-sections"
            aria-label={menuOpen ? 'Close sections menu' : 'Open sections menu'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-sections" aria-label="Sections" className="border-t border-line-soft bg-surface px-4 py-2 lg:hidden">
          <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {NAV.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex h-11 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  {label}
                </a>
              </li>
            ))}
            <li>
              <a href={import.meta.env.BASE_URL} className="flex h-11 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
                <MapIcon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                About AeroPulse
              </a>
            </li>
          </ul>
        </nav>
      )}

      {/* Station tabs below lg, where the sidebar is hidden */}
      <div className="border-t border-line-soft lg:hidden">
        <div
          role="tablist"
          aria-label="Station"
          className="-mb-px flex gap-1 overflow-x-auto px-3 [scrollbar-width:none] sm:px-5 [&::-webkit-scrollbar]:hidden"
        >
          {stations.map((st) => {
            const id = String(st.stationId || st.id);
            const selected = id === String(activeStationId);
            const band = bandFor(st.latest?.pm25);
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onSelectStation(id)}
                className={cn(
                  'flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-[13px] font-medium transition-colors duration-150',
                  selected ? 'border-ink text-ink' : 'border-transparent text-ink-2 hover:text-ink'
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: band.solid }} aria-hidden />
                {st.name}
                <span className="num font-mono text-xs text-ink-3">
                  {st.latest?.pm25 != null ? st.latest.pm25.toFixed(0) : '–'}
                </span>
                <span className="sr-only">micrograms per cubic metre, {band.category}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
