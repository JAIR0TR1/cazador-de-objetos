import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { updateSettings } from '@/features/profile/settings';

beforeEach(() => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  updateSettings({ haptics: true, reduceMotion: false });
});

describe('Button', () => {
  it('tiene rol y etiqueta accesibles y responde al toque', async () => {
    const onPress = jest.fn();
    await render(<Button label="Guardar en colección" onPress={onPress} accessibilityHint="Abre tu colección" />);
    const btn = screen.getByRole('button', { name: 'Guardar en colección' });
    expect(btn.props.accessibilityHint).toBe('Abre tu colección');
    await fireEvent.press(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('cargando: muestra el indicador, se anuncia ocupado y no responde', async () => {
    const onPress = jest.fn();
    await render(<Button label="Entrar" onPress={onPress} loading />);
    const btn = screen.getByRole('button', { name: 'Entrar' });
    expect(btn).toBeBusy();
    expect(btn).toBeDisabled();
    expect(screen.queryByText('Entrar')).toBeNull(); // el texto se reemplaza por el spinner
    await fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('deshabilitado: no llama a onPress', async () => {
    const onPress = jest.fn();
    await render(<Button label="Subir" onPress={onPress} disabled />);
    const btn = screen.getByRole('button', { name: 'Subir' });
    expect(btn).toBeDisabled();
    await fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('la etiqueta admite 2 líneas para no cortarse con texto grande', async () => {
    await render(<Button label="Borrar datos de este teléfono" onPress={() => {}} />);
    expect(screen.getByText('Borrar datos de este teléfono').props.numberOfLines).toBe(2);
  });
});

describe('TextField', () => {
  it('muestra la etiqueta visible y el error en línea (anunciado por el lector)', async () => {
    await render(<TextField label="Correo" value="" onChangeText={() => {}} error="Escribe tu correo." />);
    expect(screen.getByText('Correo')).toBeOnTheScreen();
    const error = screen.getByText('Escribe tu correo.');
    expect(error).toBeOnTheScreen();
    expect(screen.getByLabelText('Correo').props.accessibilityHint).toBe('Escribe tu correo.');
  });

  it('sin error muestra la pista', async () => {
    await render(<TextField label="Contraseña" value="" onChangeText={() => {}} hint="Mínimo 8 caracteres." />);
    expect(screen.getByText('Mínimo 8 caracteres.')).toBeOnTheScreen();
  });

  it('el botón del ojo alterna mostrar/ocultar contraseña', async () => {
    await render(<TextField label="Contraseña" value="abc" onChangeText={() => {}} secureToggle />);
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(false);
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toBeOnTheScreen();
  });

  it('propaga lo que se escribe', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="Correo" value="" onChangeText={onChangeText} />);
    await fireEvent.changeText(screen.getByLabelText('Correo'), 'ana@correo.com');
    expect(onChangeText).toHaveBeenCalledWith('ana@correo.com');
  });
});

describe('EmptyState', () => {
  it('muestra título, mensaje y una acción clara', async () => {
    const onPress = jest.fn();
    await render(<EmptyState icon="grid" title="Tu colección está vacía" message="Escanea algo." cta={{ label: 'Escanear objeto', onPress }} />);
    expect(screen.getByText('Tu colección está vacía')).toBeOnTheScreen();
    expect(screen.getByText('Escanea algo.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Escanear objeto' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('acción secundaria opcional', async () => {
    const secondary = jest.fn();
    await render(<EmptyState icon="refresh" tone="error" title="Error" message="m" secondary={{ label: 'Usar modo demo', onPress: secondary }} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Usar modo demo' }));
    expect(secondary).toHaveBeenCalled();
  });
});

describe('Skeleton', () => {
  it('se anuncia como "Cargando" al lector de pantalla', async () => {
    await render(<Skeleton style={{ height: 20 }} />);
    expect(screen.getByLabelText('Cargando')).toBeOnTheScreen();
  });
});
