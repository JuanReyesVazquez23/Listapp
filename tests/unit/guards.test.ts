import { es } from '@/strings/es';
import { supermarketNameError } from '@/useCases/guards';

describe('errores de validación del supermercado', () => {
  it('marca el supermercado obligatorio como error del campo', () => {
    const error = supermarketNameError('required');

    expect(error.code).toBe('VALIDATION');
    expect(error.message).toBe(es.validation.supermarketRequired);
    expect(error.details).toMatchObject({ field: 'supermarketName' });
  });

  it('marca el supermercado demasiado largo como error del campo', () => {
    const error = supermarketNameError('too_long');

    expect(error.code).toBe('VALIDATION');
    expect(error.message).toBe(es.validation.supermarketTooLong);
    expect(error.details).toMatchObject({ field: 'supermarketName' });
  });
});
