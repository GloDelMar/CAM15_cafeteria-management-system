'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { logout } from '@/lib/auth';

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  
  // No mostrar navegación en la página de login
  if (pathname === '/login') {
    return null;
  }

  const handleLogout = () => {
    if (confirm('¿Estás seguro?')) {
      logout();
      router.push('/login');
    }
    setIsMenuOpen(false);
  };
  
  // Navegación simplificada para un solo caja
  const navItems = [
    { href: '/', label: 'Inicio', icon: '🏠' },
    { href: '/ventas', label: 'Vender', icon: '🛒' },
    { href: '/comandas', label: 'Comandas', icon: '🍽️' },
    { href: '/productos', label: 'Productos', icon: '📦' },
    { href: '/recibos', label: 'Recibos', icon: '📄' },
    { href: '/deudores', label: 'Deudores', icon: '👥' },
    { href: '/caja', label: 'Caja', icon: '💰' },
  ];
  
  return (
    <nav className="topbar-nav bg-blue-900 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-20 sm:h-24 md:h-28">
          {/* Logo y Nombre */}
          <Link href="/" className="no-underline hover:no-underline visited:no-underline flex items-center space-x-1.5 sm:space-x-2 hover:opacity-90 transition-opacity focus:outline-none focus:ring-4 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-900 rounded-lg px-1 py-0.5">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 overflow-hidden rounded-lg bg-sky-100/90 p-1 flex items-center justify-center">
              <Image
                src="/cafeteria_logo.png"
                alt="Cafetería CAM 15 Logo"
                fill
                className="object-contain object-center scale-105"
              />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-base sm:text-lg md:text-2xl font-black text-white leading-tight">
                Cafetería CAM 15
              </span>
              <span className="text-[10px] sm:text-xs md:text-sm text-amber-50 font-semibold">
                Punto de Venta
              </span>
            </div>
          </Link>

          {/* Desktop menu */}
          <div className="hidden lg:flex items-center space-x-1 flex-1 justify-center px-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`no-underline hover:no-underline visited:no-underline px-4 py-2.5 rounded-lg text-sm md:text-base font-semibold transition-all focus:outline-none focus:ring-4 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-900 ${
                    isActive
                      ? 'bg-white text-black visited:text-black shadow-md'
                      : 'text-white visited:text-white hover:bg-blue-800'
                  }`}
                  title={item.label}
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Logout button - Desktop */}
          <button
            onClick={handleLogout}
            className="hidden sm:block px-4 py-2.5 bg-white text-blue-900 font-bold rounded-lg hover:bg-amber-50 transition-all focus:outline-none focus:ring-4 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-900 text-sm md:text-base"
            title="Cerrar sesión"
          >
            🚪 Salir
          </button>

          {/* Hamburger button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-3 rounded-lg text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-900 transition-all"
            aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isMenuOpen}
          >
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t-2 border-white border-opacity-30 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`no-underline hover:no-underline visited:no-underline block px-4 py-3 rounded-lg text-base font-semibold transition-all focus:outline-none focus:ring-4 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-900 ${
                    isActive
                      ? 'bg-white text-black visited:text-black shadow-md'
                      : 'text-white visited:text-white hover:bg-blue-800'
                  }`}
                >
                  <span className="mr-2 text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
            
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 bg-white text-blue-900 font-bold rounded-lg hover:bg-amber-50 transition-all focus:outline-none focus:ring-4 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-900 text-base"
            >
              🚪 Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
