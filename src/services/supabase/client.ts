import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

/**
 * Cliente único de Supabase. La URL y la anon/publishable key son públicas por diseño:
 * la seguridad la ponen las políticas RLS de la base de datos y del bucket "scans".
 * Nunca hay llaves de servicio en la app.
 */
const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = () => /^https:\/\//.test(url) && anonKey.length > 20;

// Si falta la configuración, se crea igual con valores de relleno para no romper imports;
// la app detecta isSupabaseConfigured() y ofrece solo el modo invitado.
export const supabase: SupabaseClient = createClient(url || 'https://sin-configurar.supabase.co', anonKey || 'sin-configurar', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});

/** Bucket privado de fotos. Ruta: {user_id}/{creature_id}/{n}.jpg */
export const SCANS_BUCKET = 'scans';

// Refresca el token solo con la app en primer plano (recomendación oficial para RN).
if (isSupabaseConfigured()) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
