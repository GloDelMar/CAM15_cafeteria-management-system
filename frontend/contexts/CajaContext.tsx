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

  // Cargar caja seleccionada desde localStorage o del backend al iniciar
  useEffect(() => {
    const initializeCaja = async () => {
      try {
        // Primero intentar desde localStorage
        const savedCaja = localStorage.getItem('selected_caja');
        if (savedCaja) {
          try {
            setSelectedCajaState(JSON.parse(savedCaja));
            setIsLoading(false);
            return;
          } catch (e) {
            console.error('Error loading selected caja from localStorage:', e);
          }
        }

        // Si no hay en localStorage, cargar del backend (caja única)
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${API_URL}/api/cajas/?activa_only=true`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const cajas = await response.json();
          if (Array.isArray(cajas) && cajas.length > 0) {
            const caja = cajas[0]; // Caja única en single-caja mode
            setSelectedCajaState(caja);
            localStorage.setItem('selected_caja', JSON.stringify(caja));
          }
        }
      } catch (e) {
        console.error('Error initializing caja from backend:', e);
      } finally {
        setIsLoading(false);
      }
    };

    initializeCaja();
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
