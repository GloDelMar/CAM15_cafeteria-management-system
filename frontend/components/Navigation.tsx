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
    { href: '/productos', label: 'Productos', icon: '📦' },
    { href: '/recibos', label: 'Recibos', icon: '📄' },
    { href: '/deudores', label: 'Deudores', icon: '👥' },
    { href: '/caja', label: 'Caja', icon: '💰' },
  ];
  
  return (
    <nav className="bg-gradient-to-r from-amber-900 via-amber-800 to-yellow-700 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-16 sm:h-20 md:h-20">
          {/* Logo y Nombre - Comentado: puede ser agregado luego si se desea */}
          {/* 
          <Link href="/" className="flex items-center space-x-2 sm:space-x-3 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-amber-900 rounded-lg px-2 py-1">
            <Image 
              src="/cam15_logo.png" 
              alt="Cafetería CAM 15 Logo" 
              width={40} 
              height={40}
              className="object-contain sm:w-12 sm:h-12 md:w-14 md:h-14"
            />
          </Link>
          */}
          
          <Link href="/" className="flex items-center hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-amber-900 rounded-lg px-2 py-1">
            <div className="flex flex-col">
              <span className="text-base sm:text-lg md:text-2xl font-black text-white leading-tight">
                Cafetería CAM 15
              </span>
              <span className="text-[10px] sm:text-xs md:text-sm text-amber-100 font-semibold">
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
                  className={`px-4 py-2.5 rounded-lg text-sm md:text-base font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                    isActive
                      ? 'bg-white text-amber-900 shadow-md'
                      : 'text-white hover:bg-white hover:bg-opacity-10'
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
            className="hidden sm:block px-4 py-2.5 bg-white text-amber-900 font-bold rounded-lg hover:bg-amber-100 transition-all focus:outline-none focus:ring-2 focus:ring-amber-300 text-sm md:text-base"
            title="Cerrar sesión"
          >
            🚪 Salir
          </button>

          {/* Hamburger button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-3 rounded-lg text-white hover:bg-white hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all"
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
                  className={`block px-4 py-3 rounded-lg text-base font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                    isActive
                      ? 'bg-white text-amber-900 shadow-md'
                      : 'text-white hover:bg-white hover:bg-opacity-10'
                  }`}
                >
                  <span className="mr-2 text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
            
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 bg-white text-amber-900 font-bold rounded-lg hover:bg-amber-100 transition-all focus:outline-none focus:ring-2 focus:ring-amber-300 text-base"
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
