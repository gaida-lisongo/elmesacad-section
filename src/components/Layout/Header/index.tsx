"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { buildHeaderData, headerData, type HeaderSectionItem } from "../Header/Navigation/menuData";
import Logo from "./Logo";

const Header: React.FC = () => {
  const pathUrl = usePathname();

  const [navbarOpen, setNavbarOpen] = useState(false);
  const [sticky, setSticky] = useState(false);
  const [headerItems, setHeaderItems] = useState(headerData);
  const [openMobileSubmenus, setOpenMobileSubmenus] = useState<Record<string, boolean>>({});

  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const headerRootRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const el = headerRootRef.current;
    if (!el) return;
    const root = document.documentElement;
    const sync = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      if (h > 0) root.style.setProperty("--app-header-h", `${h}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  const handleScroll = () => {
    setSticky(window.scrollY >= 80);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) && navbarOpen) {
      setNavbarOpen(false);
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [navbarOpen]);

  useEffect(() => {
    if (navbarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [navbarOpen]);

  useEffect(() => {
    let mounted = true;
    const loadHeaderData = async () => {
      try {
        const [secRes, labRes] = await Promise.all([
          fetch("/api/public/header-sections", { cache: "no-store" }),
          fetch("/api/public/header-laboratoires", { cache: "no-store" }),
        ]);

        const [secPayload, labPayload] = await Promise.all([
          secRes.json().catch(() => ({ data: [] })),
          labRes.json().catch(() => ({ data: [] })),
        ]);

        if (!mounted) return;

        const sections = Array.isArray(secPayload.data) ? secPayload.data : [];
        const laboratoires = Array.isArray(labPayload.data) ? labPayload.data : [];

        setHeaderItems(buildHeaderData(sections, laboratoires));
      } catch {
        if (!mounted) return;
        setHeaderItems(buildHeaderData([], []));
      }
    };
    void loadHeaderData();
    return () => {
      mounted = false;
    };
  }, []);

  const toggleMobileSubmenu = (key: string) => {
    setOpenMobileSubmenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <header
      ref={headerRootRef}
      className="fixed top-0 z-50 w-full bg-transparent transition-all"
    >
      <div className="px-4 py-3">
        <div
          className={`mx-auto flex w-full max-w-6xl items-center justify-between rounded-full border border-white/40 bg-white/90 px-4 py-2 backdrop-blur dark:border-white/10 dark:bg-dark/90 ${
            sticky ? "shadow-md" : "shadow-sm"
          }`}
        >
          <div className="shrink-0 pr-3">
            <Logo />
          </div>

          <nav className="hidden items-center gap-1 lg:ml-auto lg:flex">
            {headerItems.map((item) => {
              const active = pathUrl === item.href || (item.href !== "/" && pathUrl.startsWith(item.href));
              const hasSubmenu = Array.isArray(item.submenu) && item.submenu.length > 0;

              if (hasSubmenu) {
                return (
                  <div key={item.label} className="group relative">
                    <Link
                      href={item.href}
                      className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                        active
                          ? "bg-primary text-white"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      {item.label}
                      <span className="text-xs">▾</span>
                    </Link>
                    <div className="invisible absolute left-0 top-full z-50 w-64 rounded-xl border border-slate-200 bg-white p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 dark:border-slate-700 dark:bg-darklight">
                      <div className="max-h-72 overflow-y-auto">
                        {item.submenu?.map((subItem) => (
                          <Link
                            key={`${item.label}-${subItem.href}`}
                            href={subItem.href}
                            className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            {subItem.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-primary text-white"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setNavbarOpen(!navbarOpen)}
              className="block rounded-lg p-2 lg:hidden"
              aria-label="Toggle mobile menu"
            >
              <span className="block h-0.5 w-6 bg-black dark:bg-white"></span>
              <span className="mt-1.5 block h-0.5 w-6 bg-black dark:bg-white"></span>
              <span className="mt-1.5 block h-0.5 w-6 bg-black dark:bg-white"></span>
            </button>
          </div>
        </div>
        {navbarOpen && (
          <div className="fixed top-0 left-0 w-full h-full bg-black/50 z-40" />
        )}
        <div
          ref={mobileMenuRef}
          className={`lg:hidden fixed top-0 right-0 h-full w-full bg-white dark:bg-dark shadow-lg transform transition-transform duration-300 max-w-xs ${navbarOpen ? "translate-x-0" : "translate-x-full"} z-50`}
        >
          <div className="flex items-center justify-between p-4">
            <h2 className="text-lg font-bold text-midnight_text dark:text-white">Menu</h2>
            <button onClick={() => setNavbarOpen(false)} aria-label="Close mobile menu">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="dark:text-white">
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <nav className="flex flex-col items-start p-4">
            {headerItems.map((item) => {
              const hasSubmenu = Array.isArray(item.submenu) && item.submenu.length > 0;
              if (!hasSubmenu) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setNavbarOpen(false)}
                    className="w-full rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {item.label}
                  </Link>
                );
              }

              const key = `${item.label}-${item.href}`;
              const isOpen = Boolean(openMobileSubmenus[key]);

              return (
                <div key={key} className="w-full">
                  <button
                    type="button"
                    onClick={() => toggleMobileSubmenu(key)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <span>{item.label}</span>
                    <span className={`text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                  </button>
                  {isOpen ? (
                    <div className="ml-2 mt-1 space-y-1 border-l border-slate-200 pl-2 dark:border-slate-700">
                      {item.submenu?.map((subItem) => (
                        <Link
                          key={`${key}-${subItem.href}`}
                          href={subItem.href}
                          onClick={() => setNavbarOpen(false)}
                          className="block rounded-md px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
