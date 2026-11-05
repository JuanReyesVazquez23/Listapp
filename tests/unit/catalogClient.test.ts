import { HttpCatalogClient } from '@/infrastructure/catalog/catalogClient';

const baseUrl = 'https://api.example.com/api/catalog';

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function product(index: number, imageUrl: string | null = null) {
  return {
    productId: String(index),
    name: `Pan ${index}`,
    brand: 'Marca',
    presentation: null,
    priceCents: 100 + index,
    imageUrl,
  };
}

describe('HttpCatalogClient', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('devuelve todos los resultados y no envía un límite artificial', async () => {
    const results = Array.from({ length: 12 }, (_, index) => product(index));
    fetchMock.mockResolvedValue(jsonResponse({ results }));

    const outcome = await new HttpCatalogClient(baseUrl).search('pan');

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.products).toHaveLength(12);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('q=pan');
    expect(url).not.toContain('limit=');
  });

  it('acepta solo imágenes HTTPS y conserva el producto si la URL no sirve', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [
          product(1, 'https://gruporamos.vteximg.com.br/pan.jpg'),
          product(2, 'http://gruporamos.vteximg.com.br/pan.jpg'),
          product(3, null),
        ],
      }),
    );

    const outcome = await new HttpCatalogClient(baseUrl).search('pan');

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.products.map((entry) => entry.imageUrl)).toEqual([
      'https://gruporamos.vteximg.com.br/pan.jpg',
      null,
      null,
    ]);
  });

  it('traduce una respuesta rota y un error de consulta', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: 'no-es-lista' }));
    const broken = await new HttpCatalogClient(baseUrl).search('pan');
    expect(broken).toEqual({ ok: false, reason: 'invalid_response' });

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'invalid_query' }, 400));
    const invalid = await new HttpCatalogClient(baseUrl).search('a');
    expect(invalid).toEqual({ ok: false, reason: 'invalid_query' });
  });
});
