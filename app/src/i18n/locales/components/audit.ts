const es = {
  title: 'Historial',
  globalTitle: 'Actividad global',
  empty: 'Sin actividad registrada.',
  actions: {
    created: 'creó',
    updated: 'editó',
    deleted: 'eliminó',
  },
  entities: {
    entrada: 'la entrada',
    salida: 'la salida',
    factura: 'la factura',
    attachment: 'el adjunto',
    organization: 'el aliado',
    contact: 'el contacto',
    area: 'el área',
    linea: 'la línea',
  },
}

const en: typeof es = {
  title: 'History',
  globalTitle: 'Global activity',
  empty: 'No activity recorded.',
  actions: {
    created: 'created',
    updated: 'edited',
    deleted: 'deleted',
  },
  entities: {
    entrada: 'inflow',
    salida: 'outflow',
    factura: 'invoice',
    attachment: 'attachment',
    organization: 'partner',
    contact: 'contact',
    area: 'area',
    linea: 'line',
  },
}

export default { es, en }
