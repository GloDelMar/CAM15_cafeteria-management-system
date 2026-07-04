'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { logout } from '@/lib/auth';
import { useCaja } from '@/contexts/CajaContext';

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { selectedCaja, setSelectedCaja } = useCaja();
  
  // No mostrar navegación en la página de login
  if (pathname === '/login') {
    return null;
  }

  const handleLogout = () => {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      logout();
      setSelectedCaja(null);
      router.push('/login');
    }
    setIsMenuOpen(false);
  };

  const handleChangeCaja = () => {
    setSelectedCaja(null);
    router.push('/');
    setIsMenuOpen(false);
  };
  
  const navItems = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/cajas', label: 'Gestión Cajas', icon: '⚙️' },
    { href: '/ventas', label: 'Ventas', icon: '🛒', requiresCaja: true },
    { href: '/productos', label: 'Productos', icon: '📦', requiresCaja: true },
    { href: '/recibos', label: 'Recibos', icon: '📄', requiresCaja: true },
    { href: '/deudores', label: 'Deudores', icon: '👥', requiresCaja: true },
    { href: '/caja', label: 'Operaciones', icon: '💰', requiresCaja: true },
  ];
  
  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <Image 
              src="/cam15_logo.png" 
              alt="CAM15 Logo" 
              width={32} 
              height={32}
              className="object-contain sm:w-10 sm:h-10"
            />
            <div className="flex flex-col">
              <span className="text-sm sm:text-lg font-bold text-gray-900 leading-tight">La Tiendita</span>
              <span className="text-[10px] sm:text-xs text-gray-600">CAM No.15</span>
            </div>
          </Link>

          {/* Caja actual - visible en mobile */}
          {selectedCaja && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-xs sm:text-sm font-semibold text-blue-900">Caja: {selectedCaja.nombre}</span>
              <button
                onClick={handleChangeCaja}
                className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-800 underline"
                title="Cambiar de caja"
              >
                Cambiar
              </button>
            </div>
          )}
          
          {/* Desktop menu */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const isDisabled = item.requiresCaja && !selectedCaja;
              
              if (isDisabled) {
                return (
                  <div
                    key={item.href}
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-400 cursor-not-allowed"
                    title="Selecciona una caja primero"
                  >
                    <span className="mr-1">{item.icon}</span>
                    {item.label}
                  </div>
                );
              }
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
            
            <button
              onClick={handleLogout}
              className="ml-2 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              title="Cerrar Sesión"
            >
              <span className="mr-1">🚪</span>
              Salir
            </button>
          </div>

          {/* Hamburger button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
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
          <div className="lg:hidden py-3 border-t">
            {/* Caja actual en mobile */}
            {selectedCaja && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 mb-2 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-xs font-semibold text-blue-900">Caja: {selectedCaja.nombre}</span>
                <button
                  onClick={handleChangeCaja}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Cambiar
                </button>
              </div>
            )}

            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const isDisabled = item.requiresCaja && !selectedCaja;
                
                if (isDisabled) {
                  return (
                    <div
                      key={item.href}
                      className="block px-3 py-2.5 rounded-md text-sm font-medium text-gray-400 cursor-not-allowed"
                    >
                      <span className="mr-2">{item.icon}</span>
                      {item.label}
                    </div>
                  );
                }
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
              
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <span className="mr-2">🚪</span>
                Salir
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
