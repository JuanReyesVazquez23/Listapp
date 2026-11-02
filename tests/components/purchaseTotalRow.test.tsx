import { render, screen } from '@testing-library/react-native';

import {
  CatalogChip,
  PurchaseTotalRow,
} from '@/components/compras/PurchaseTotalRow';

describe('PurchaseTotalRow', () => {
  it('muestra el total exacto cuando todas las líneas tienen precio', async () => {
    await render(<PurchaseTotalRow totalCents={550} unpricedCount={0} />);

    expect(screen.getByText('Total · RD$5.50')).toBeTruthy();
    expect(
      screen.getByLabelText('Total · RD$5.50'),
    ).toBeTruthy();
  });

  it('avisa de un total parcial y de cuántos artículos faltan', async () => {
    await render(<PurchaseTotalRow totalCents={300} unpricedCount={2} />);

    expect(screen.getByText('Total parcial · RD$3.00')).toBeTruthy();
    expect(screen.getByText('2 artículos sin precio')).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Total parcial · RD$3.00. 2 artículos sin precio',
      ),
    ).toBeTruthy();
  });

  it('no inventa RD$0.00 cuando ninguna línea tiene precio', async () => {
    await render(<PurchaseTotalRow totalCents={null} unpricedCount={1} />);

    expect(screen.getByText('Aún no hay precios')).toBeTruthy();
    expect(screen.getByText('1 artículo sin precio')).toBeTruthy();
    expect(screen.queryByText(/RD\$/)).toBeNull();
  });

  it('no pinta nada si no hay total ni artículos sin precio', async () => {
    await render(<PurchaseTotalRow totalCents={null} unpricedCount={0} />);

    expect(screen.queryByText('Aún no hay precios')).toBeNull();
  });

  it('muestra el chip del modo catálogo', async () => {
    await render(<CatalogChip />);

    expect(screen.getByText('Con La Sirena')).toBeTruthy();
  });
});
