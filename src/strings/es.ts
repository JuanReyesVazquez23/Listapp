/**
 * Todos los textos visibles. La UI no escribe cadenas literales.
 */
export const es = {
  appName: 'Listapp',
  tabs: {
    lists: 'Listas',
    history: 'Historial',
  },
  common: {
    cancel: 'Cancelar',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    undo: 'Deshacer',
    loading: 'Cargando…',
    close: 'Cerrar',
    backToLists: 'Volver a Listas',
  },
  theme: {
    toggle: 'Cambiar tema',
    toDark: 'Activar tema oscuro',
    toLight: 'Activar tema claro',
  },
  lists: {
    emptyTitle: 'Aún no hay listas',
    emptyBody: 'Crea una para empezar tu próxima compra.',
    createFirst: 'Crear mi primera lista',
    newList: 'Nueva lista',
    draftsSection: 'Borradores',
    itemCount: (count: number) =>
      count === 1 ? '1 artículo' : `${count} artículos`,
    updated: (date: string) => `Actualizada el ${date}`,
    activeShoppingTitle: 'Compra en curso',
    activeShoppingBadge: 'En compra',
    continueShopping: 'Continuar compra',
  },
  status: {
    draft: 'Borrador',
    shopping: 'En compra',
    completed: 'Finalizada',
  },

  newList: {
    title: 'Nueva lista',
    nameLabel: 'Nombre de la lista',
    placeholder: 'Ej. Compra semanal',
    create: 'Crear',
    creating: 'Creando…',
  },
  detail: {
    title: 'Lista',
    renameList: 'Renombrar',
    deleteList: 'Eliminar lista',
    deleteListTitle: 'Eliminar lista',
    deleteListBody:
      'Se borrarán la lista y todos sus artículos. Esta acción no se puede deshacer.',
    itemsSection: 'Artículos',
    emptyTitle: 'Añade tu primer artículo',
    emptyBody: 'Escribe el nombre del artículo y pulsa Añadir.',
    addItemLabel: 'Añadir artículo',
    addItemPlaceholder: 'Ej. Leche',
    add: 'Añadir',
    itemNameInput: 'Nombre del artículo',
    optionsLabel: 'Opciones de la lista',
    itemDeleted: 'Artículo eliminado',
    editItemLabel: (name: string) => `Editar ${name}`,
    deleteItemLabel: (name: string) => `Eliminar ${name}`,
    itemsProgress: (checked: number, total: number) =>
      `${checked} de ${total} comprados`,
    startShopping: 'Empezar compra',
    continueShopping: 'Continuar compra',
    startShoppingHint: 'Añade al menos un artículo para empezar la compra.',
    shoppingNotice: 'El progreso se guarda automáticamente.',
  },
  shopping: {
    title: 'Compra',
    optionsLabel: 'Opciones de la compra',
    autoSave: 'Los cambios se guardan al instante.',
    itemLabel: (name: string, checked: boolean) =>
      `${name}, ${checked ? 'comprado' : 'no comprado'}`,
    toggleHint: 'Toca para cambiar',
    checkedTag: 'Comprado',
    cancel: 'Cancelar compra',
    cancelTitle: 'Cancelar compra',
    cancelBody:
      'Se desmarcarán todos los artículos y la lista volverá a borrador. ¿Cancelar la compra?',
    keepShopping: 'Seguir comprando',
    emptyTitle: 'Esta compra no tiene artículos',
    emptyBody: 'Añade uno para continuar.',
  },
  shoppingMode: {
    title: 'Modo de compra',
    body:
      'Elige cómo quieres comprar. El modo queda fijo hasta terminar o cancelar la compra.',
    normal: 'Compra normal',
    catalog: 'Con La Sirena',
  },
  itemDetail: {
    title: 'Detalle del artículo',
    brandsTitle: 'Marcas y presentaciones',
    brandsHint: 'Toca una para usar su marca y su precio.',
    searching: 'Buscando marcas…',
    noResults: (name: string) => `No encontramos marcas para «${name}».`,
    noResultsHint: 'Puedes escribir la marca y el precio a mano.',
    searchLabel: 'Buscar en La Sirena',
    searchPlaceholder: 'Corregir la búsqueda',
    searchAction: 'Buscar',
    searchHint: 'La búsqueda usa el nombre del artículo.',
    autoSearchHint: 'Buscamos en La Sirena con el nombre del artículo.',
    resultsLabel: 'Resultados de La Sirena',
    resultsCount: (visible: number, total: number) => {
      const noun =
        total === 1 ? '1 presentación' : `${total} presentaciones`;
      return visible === total ? noun : `${visible} de ${noun}`;
    },
    filterLabel: 'Filtrar resultados',
    filterPlaceholder: 'Marca o presentación',
    brandFilterLabel: 'Marca',
    brandFilterListLabel: 'Marcas disponibles',
    allBrands: 'Todas',
    sortLabel: 'Ordenar por',
    sortRelevance: 'Relevancia',
    sortPriceAsc: 'Menor precio',
    sortPriceDesc: 'Mayor precio',
    sortMeasureAsc: 'Mejor precio por medida',
    clearFilters: 'Limpiar filtros',
    filteredEmpty: 'Ninguna presentación coincide con el filtro.',
    measureUnits: {
      pound: 'lb',
      liter: 'L',
      unit: 'und',
    },
    pricePerMeasure: (price: string, unit: string) => `${price}/${unit}`,
    selectProduct: (
      brand: string,
      name: string,
      price: string,
      measure?: string,
    ) => `Elegir ${brand}, ${name}, ${price}${measure ? `, ${measure}` : ''}`,
    selectedProduct: 'Producto elegido',
    discardTitle: 'Descartar el detalle',
    discardBody: 'Los cambios de marca, cantidad o precio no se guardarán.',
    discard: 'Descartar',
    keepEditing: 'Seguir editando',
    brandLabel: 'Marca',
    brandPlaceholder: 'Ej. Natures Own',
    quantityLabel: 'Cantidad',
    quantityPlaceholder: '1',
    unitLabel: 'Unidad',
    priceLabel: 'Precio por unidad',
    pricePlaceholder: 'Ej. 175.00',
    priceHint: 'Escribe el precio sin separador de miles. Ej. 175.00',
    subtotalLabel: 'Subtotal',
    save: 'Guardar detalle',
    saving: 'Guardando…',
    skip: 'Omitir',
    removeData: 'Quitar datos',
    removeDataTitle: 'Quitar datos',
    removeDataBody:
      'Se borrarán la marca, la cantidad y el precio. El artículo seguirá marcado como comprado.',
    removePurchase: 'Quitar de la compra',
    removeTitle: 'Quitar de la compra',
    removeBody: 'El artículo volverá a quedar sin comprar y se borrará su detalle.',
    savedAnnouncement: 'Detalle guardado',
    skippedAnnouncement: 'Artículo marcado sin precio',
    catalogUnavailable: 'No se pudo consultar el catálogo. Puedes continuar a mano.',
    catalogOffline: 'Sin conexión. Puedes continuar a mano.',
    catalogTimeout: 'El catálogo tardó demasiado. Puedes continuar a mano.',
    retry: 'Reintentar',
    invalidQuery: 'Escribe al menos dos letras para buscar.',
    openLabel: (name: string, priced: boolean) =>
      `Abre el detalle de ${name}, ${priced ? 'con precio' : 'sin precio'}`,
    openHint: 'Toca para elegir marca, cantidad y precio',
  },
  units: {
    unit: 'Unidad',
    pound: 'Libra',
    kilogram: 'Kilogramo',
    liter: 'Litro',
  },
  total: {
    exact: (amount: string) => `Total · ${amount}`,
    partial: (amount: string) => `Total parcial · ${amount}`,
    unpriced: (count: number) =>
      count === 1 ? '1 artículo sin precio' : `${count} artículos sin precio`,
    partialHint: 'El total no incluye los artículos sin precio.',
    noPrices: 'Aún no hay precios',
    historyNoPrices: (count: number) =>
      count === 1 ? 'Sin precios · 1 artículo' : `Sin precios · ${count} artículos`,
    catalogChip: 'Con La Sirena',
  },
  finish: {
    summary: (checked: number, unchecked: number) =>
      `${checked === 1 ? '1 comprado' : `${checked} comprados`} · ${unchecked} sin comprar`,
    confirmTitle: 'Finalizar compra',
    confirmBody: (unchecked: number) => {
      if (unchecked === 0) {
        return '¿Seguro que quieres terminar la compra?';
      }
      return unchecked === 1
        ? '¿Seguro que quieres terminar la compra? Se guardará 1 artículo sin comprar.'
        : `¿Seguro que quieres terminar la compra? Se guardarán ${unchecked} artículos sin comprar.`;
    },
    confirmZeroBody:
      'No has marcado ningún artículo. Se guardará la compra con 0 comprados. ¿Quieres continuar?',
    submit: 'Finalizar compra',
    submitting: 'Guardando…',
    savedAnnouncement: 'Compra guardada',
  },
  purchase: {
    title: 'Compra',
    optionsLabel: 'Opciones de la compra',
    checkedSection: 'Comprados',
    uncheckedSection: 'Sin comprar',
    progress: (checked: number, total: number) => `${checked} de ${total} comprados`,
    rowLabel: (date: string, name: string, progress: string, total?: string) =>
      `${date}, ${name}, ${progress}${total ? `, ${total}` : ''}`,
    itemLabel: (name: string, checked: boolean) =>
      `${name}, ${checked ? 'comprado' : 'no comprado'}`,
    itemDetailLabel: (name: string, checked: boolean, detail: string) =>
      `${name}, ${checked ? 'comprado' : 'no comprado'}, ${detail}`,
    deleteTitle: 'Eliminar compra',
    deleteBody:
      'Se borrarán la compra y sus artículos. Esta acción no se puede deshacer.',
  },
  history: {
    emptyTitle: 'Todavía no has finalizado ninguna compra',
    emptyBody: 'Cuando termines una compra, aparecerá aquí con la fecha y el progreso.',
    emptyAction: 'Ir a Listas',
  },
  notFound: {
    header: 'No encontrado',
    title: 'Esta lista no existe o se ha eliminado.',
    body: 'Vuelve a Listas para continuar.',
    action: 'Volver a Listas',
  },
  validation: {
    listNameRequired: 'Escribe un nombre para la lista.',
    listNameTooLong: 'El nombre no puede superar los 80 caracteres.',
    itemNameRequired: 'Escribe un nombre para el artículo.',
    itemNameTooLong: 'El nombre no puede superar los 100 caracteres.',
    itemBrandTooLong: 'La marca no puede superar los 60 caracteres.',
    itemQuantityRequired: 'Escribe la cantidad.',
    itemQuantityInvalid: 'Cantidad no válida. Usa hasta tres decimales.',
    itemQuantityTooLarge: 'La cantidad es demasiado grande.',
    itemPriceRequired: 'Escribe el precio.',
    itemPriceInvalid: 'Precio no válido. Usa hasta dos decimales.',
    itemPriceTooLarge: 'El precio es demasiado alto.',
    itemUnitRequired: 'Elige una unidad.',
  },
  errors: {
    generic: 'No se pudo guardar. Reintenta.',
    load: 'No se pudo cargar la lista.',
    historyLoad: 'No se pudo cargar el historial.',
    purchaseLoad: 'No se pudo cargar la compra.',
    listNotFound: 'Esta lista no existe o se ha eliminado.',
    invalidState: 'La lista ha cambiado. Vuelve a intentarlo.',
    listCompleted: 'Esta compra ya está finalizada.',
    activeShoppingExists: 'Ya hay otra compra en curso.',
    lastItemInShopping: 'No puedes borrar el último artículo durante la compra.',
    noChecked: 'No has marcado ningún artículo.',
    emptyList: 'La lista no tiene artículos.',
    dbBroken: 'La base de datos no responde. Reinicia la app.',
    dbBusy: 'La base de datos está ocupada. Reintenta.',
  },
  boot: {
    genericTitle: 'No se pudo abrir la base de datos',
    genericBody: 'Cierra la app y vuelve a abrirla. Si el problema continúa, reinstala el APK.',
    retry: 'Reintentar',
    schemaTitle: 'Versión no compatible',
    schemaBody: (detected: number, supported: number) =>
      `La base de datos usa la versión ${detected} y esta app admite hasta la ${supported}. Instala el APK más reciente.`,
    unknownSchemaBody: 'La base de datos no tiene un esquema reconocible. Reinstala el APK.',
    brokenTitle: 'Base de datos bloqueada',
    brokenBody: 'Cierra la app desde el selector de aplicaciones y vuelve a abrirla.',
  },
} as const;
