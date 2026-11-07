import { fetchWithTimeout } from './http';

const TYPES = ['Fuego', 'Agua', 'Tierra', 'Aire', 'Metal', 'Tecno', 'Naturaleza'] as const;
const RARITIES = ['Común', 'Rara', 'Épica', 'Legendaria'] as const;

/** JSON Schema de la respuesta (Gemini structured output). */
export const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    esObjetoClaro: { type: 'boolean', description: 'true si hay un objeto físico inanimado claramente visible' },
    motivo: { type: 'string', description: 'Si no hay objeto claro, explicación breve y amable en español' },
    objeto: { type: 'string' },
    categoria: { type: 'string' },
    material: { type: 'string' },
    colores: { type: 'array', items: { type: 'string' } },
    tamanoEstimado: { type: 'string' },
    confianza: { type: 'number', description: '0 a 1' },
    criatura: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        especie: { type: 'string' },
        tipo: { type: 'string', enum: [...TYPES] },
        rareza: { type: 'string', enum: [...RARITIES] },
        stats: {
          type: 'object',
          properties: {
            ataque: { type: 'integer' },
            defensa: { type: 'integer' },
            velocidad: { type: 'integer' },
            energia: { type: 'integer' },
          },
          required: ['ataque', 'defensa', 'velocidad', 'energia'],
        },
        habilidad: { type: 'string' },
        historia: { type: 'string' },
        paleta: { type: 'array', items: { type: 'string', description: 'color hex #RRGGBB' } },
      },
      required: ['nombre', 'especie', 'tipo', 'rareza', 'stats', 'habilidad', 'historia', 'paleta'],
    },
  },
  required: ['esObjetoClaro', 'motivo', 'objeto', 'categoria', 'material', 'colores', 'tamanoEstimado', 'confianza', 'criatura'],
} as const;

const PROMPT = `Eres el motor de juego de "Cazador de Objetos". Recibes varias fotos del MISMO objeto real tomadas desde distintos ángulos.

1. Identifica el objeto principal: nombre común en español, categoría, material dominante, colores (en español), tamaño estimado y tu confianza (0 a 1).
2. Si NO hay un objeto físico inanimado claro (foto vacía, muy oscura, borrosa, una pared, o el sujeto principal es una persona o un animal), pon esObjetoClaro=false y en "motivo" una frase amable que diga cómo mejorar el escaneo. Rellena el resto con valores genéricos.
3. Convierte el objeto en una criatura coleccionable ORIGINAL (no uses nombres de franquicias existentes):
   - nombre: inventado, pegadizo, idealmente un juego de palabras en español con el objeto (una o dos palabras).
   - especie: descripción corta tipo "Guardián del vapor".
   - tipo: uno de ${TYPES.join(', ')} según material y función (metal→Metal, electrónica→Tecno, plantas/madera→Naturaleza, líquidos/vidrio→Agua, piedra/cerámica→Tierra, ligero/textil→Aire, calor/luz→Fuego).
   - rareza según lo INUSUAL del objeto: objetos cotidianos y producidos en masa → Común; algo distintivos o de diseño → Rara; poco comunes, artesanales, antiguos o muy especiales → Épica; verdaderamente raros, únicos o extraordinarios → Legendaria. Sé estricto: la mayoría de objetos de una casa son Común o Rara.
   - stats enteros de 1 a 100 coherentes con el objeto (pesado/resistente → defensa; ligero/aerodinámico → velocidad; afilado/duro → ataque; eléctrico/caliente → energía). Mayor rareza → mayor total.
   - habilidad: nombre de la habilidad y su efecto en una frase.
   - historia: 2 o 3 frases en español, con humor y relacionadas con el uso real del objeto.
   - paleta: exactamente 3 colores hex (#RRGGBB) inspirados en el objeto.
Responde SOLO con el JSON del esquema.`;

export interface Analysis {
  objeto: string;
  categoria: string;
  material: string;
  colores: string[];
  tamanoEstimado: string;
  confianza: number;
  criatura: {
    nombre: string;
    especie: string;
    tipo: (typeof TYPES)[number];
    rareza: (typeof RARITIES)[number];
    stats: { ataque: number; defensa: number; velocidad: number; energia: number };
    habilidad: string;
    historia: string;
    paleta: string[];
  };
}

export class NotObjectError extends Error {}
export class UpstreamError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

const clampStat = (n: unknown) => Math.max(1, Math.min(100, Math.round(Number(n) || 50)));
const str = (v: unknown, fb: string, max = 400) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : fb);
const HEX = /^#[0-9a-fA-F]{6}$/;

/** Valida y normaliza lo que devuelve el modelo (nunca confiamos ciegamente en la IA). */
export function normalize(raw: any): Analysis {
  if (!raw || raw.esObjetoClaro === false) {
    throw new NotObjectError(str(raw?.motivo, 'No logramos ver un objeto claro. Acércate, centra el objeto y busca buena luz.'));
  }
  const k = raw.criatura ?? {};
  const paleta = (Array.isArray(k.paleta) ? k.paleta : []).filter((h: unknown) => typeof h === 'string' && HEX.test(h)).slice(0, 3);
  while (paleta.length < 3) paleta.push(['#C6FF3D', '#2F6BFF', '#F5F3F0'][paleta.length]);
  return {
    objeto: str(raw.objeto, 'Objeto misterioso', 80),
    categoria: str(raw.categoria, 'Otro', 60),
    material: str(raw.material, 'Desconocido', 60),
    colores: (Array.isArray(raw.colores) ? raw.colores : []).filter((c: unknown) => typeof c === 'string').slice(0, 6),
    tamanoEstimado: str(raw.tamanoEstimado, 'Mediano', 60),
    confianza: Math.max(0, Math.min(1, Number(raw.confianza) || 0.5)),
    criatura: {
      nombre: str(k.nombre, 'Objetín', 40),
      especie: str(k.especie, 'Criatura curiosa', 60),
      tipo: TYPES.includes(k.tipo) ? k.tipo : 'Tierra',
      rareza: RARITIES.includes(k.rareza) ? k.rareza : 'Común',
      stats: {
        ataque: clampStat(k.stats?.ataque),
        defensa: clampStat(k.stats?.defensa),
        velocidad: clampStat(k.stats?.velocidad),
        energia: clampStat(k.stats?.energia),
      },
      habilidad: str(k.habilidad, 'Presencia misteriosa.', 200),
      historia: str(k.historia, 'Nadie sabe de dónde vino.', 600),
      paleta,
    },
  };
}

/** Modelos a intentar en orden. gemini-2.5-flash está deprecado (ver README), por eso el default es 3.6 Flash estable. */
function modelChain(): string[] {
  const list = [process.env.GEMINI_MODEL, 'gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'].filter(Boolean) as string[];
  return [...new Set(list)];
}

async function callModel(model: string, apiKey: string, images: { data: string; mime: string }[], schemaField: 'responseJsonSchema' | 'responseSchema') {
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: PROMPT }, ...images.map((img) => ({ inlineData: { mimeType: img.mime, data: img.data } }))],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      [schemaField]: ANALYSIS_SCHEMA,
      temperature: 0.9,
    },
  };
  return fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(body) },
    45000,
  );
}

export async function analyzeWithGemini(images: { data: string; mime: string }[]): Promise<{ analysis: Analysis; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new UpstreamError('El servidor no tiene configurada la IA. Usa el modo demo mientras tanto.', 503);

  let lastErr = 'sin respuesta';
  for (const model of modelChain()) {
    let res = await callModel(model, apiKey, images, 'responseJsonSchema');
    let text = await res.text();
    // Compatibilidad: algunos modelos solo aceptan responseSchema (subconjunto OpenAPI).
    if (res.status === 400 && /responseJsonSchema|Unknown name|schema/i.test(text)) {
      res = await callModel(model, apiKey, images, 'responseSchema');
      text = await res.text();
    }
    if (res.status === 404 || (res.status === 400 && /model|not found|not supported/i.test(text))) {
      lastErr = `${model}: ${res.status}`;
      continue; // probar el siguiente modelo
    }
    if (res.status === 429) throw new UpstreamError('La IA está saturada en este momento. Intenta de nuevo en unos segundos.', 503);
    if (!res.ok) {
      lastErr = `${model}: ${res.status} ${text.slice(0, 200)}`;
      if (res.status >= 500) continue;
      throw new UpstreamError('La IA no pudo procesar las fotos. Intenta con otras tomas.', 502);
    }
    const json = JSON.parse(text);
    const cand = json?.candidates?.[0];
    if (!cand?.content?.parts) {
      if (json?.promptFeedback?.blockReason || cand?.finishReason === 'SAFETY') {
        throw new NotObjectError('No pudimos analizar esas fotos. Intenta con otro objeto.');
      }
      lastErr = `${model}: respuesta vacía`;
      continue;
    }
    const out = cand.content.parts
      .filter((p: any) => typeof p.text === 'string' && !p.thought)
      .map((p: any) => p.text)
      .join('');
    let parsed: unknown;
    try {
      parsed = JSON.parse(out.replace(/^```json\s*|```$/g, ''));
    } catch {
      lastErr = `${model}: JSON inválido`;
      continue;
    }
    return { analysis: normalize(parsed), model };
  }
  console.error('[gemini] todos los modelos fallaron:', lastErr);
  throw new UpstreamError('No pudimos conectar con la IA. Intenta de nuevo en un momento.', 502);
}
