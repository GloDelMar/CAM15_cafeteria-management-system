// Sistema de autenticación simple basado en contraseña
export const AUTH_PASSWORD = process.env.NEXT_PUBLIC_AUTH_PASSWORD || 'cicloescolar2025-2026';
export const AUTH_STORAGE_KEY = 'la_tiendita_auth';

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  const auth = localStorage.getItem(AUTH_STORAGE_KEY);
  return auth === 'authenticated';
}

export function login(password: string): boolean {
  if (password === AUTH_PASSWORD) {
    localStorage.setItem(AUTH_STORAGE_KEY, 'authenticated');
    return true;
  }
  return false;
}

export function logout(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
