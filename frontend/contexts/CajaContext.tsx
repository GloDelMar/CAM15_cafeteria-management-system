'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Caja {
  id: number;
  nombre: string;
  descripcion?: string;
  activa: boolean;
}

interface CajaContextType {
  selectedCaja: Caja | null;
  setSelectedCaja: (caja: Caja | null) => void;
  isLoading: boolean;
}

const CajaContext = createContext<CajaContextType | undefined>(undefined);

export function CajaProvider({ children }: { children: ReactNode }) {
  const [selectedCaja, setSelectedCajaState] = useState<Caja | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar caja seleccionada desde localStorage al iniciar
  useEffect(() => {
    const savedCaja = localStorage.getItem('selected_caja');
    if (savedCaja) {
      try {
        setSelectedCajaState(JSON.parse(savedCaja));
      } catch (e) {
        console.error('Error loading selected caja:', e);
      }
    }
    setIsLoading(false);
  }, []);

  // Guardar en localStorage cuando cambia la caja
  const setSelectedCaja = (caja: Caja | null) => {
    setSelectedCajaState(caja);
    if (caja) {
      localStorage.setItem('selected_caja', JSON.stringify(caja));
    } else {
      localStorage.removeItem('selected_caja');
    }
  };

  return (
    <CajaContext.Provider value={{ selectedCaja, setSelectedCaja, isLoading }}>
      {children}
    </CajaContext.Provider>
  );
}

export function useCaja() {
  const context = useContext(CajaContext);
  if (context === undefined) {
    throw new Error('useCaja must be used within a CajaProvider');
  }
  return context;
}
