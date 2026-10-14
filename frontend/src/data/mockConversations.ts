// Datos SIMULADOS para desarrollo de UI. No se envían ni se presentan como
// conversaciones reales de producción; serán sustituidos por la capa de datos
// reales cuando existan los contratos de la API (ver AGENTS sección 4).
export type ConversationStatus = 'open' | 'pending' | 'resolved'

export type MessageDirection = 'inbound' | 'outbound'

export interface ConversationMessage {
  id: string
  direction: MessageDirection
  text: string
  at: string
}

export interface Conversation {
  id: string
  name: string
  description: string
  status: ConversationStatus
  unread: number
  lastMessage: string
  lastAt: string
  assignee: string
  messages: ConversationMessage[]
}

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    name: 'Lucía Fernández',
    description: 'Consulta de facturación',
    status: 'open',
    unread: 2,
    lastMessage: '¿Me podrías reenviar el comprobante?',
    lastAt: 'hace 2 min',
    assignee: 'María López',
    messages: [
      {
        id: 'm1',
        direction: 'inbound',
        text: 'Hola, necesito el comprobante de la segunda factura.',
        at: '10:02',
      },
      {
        id: 'm2',
        direction: 'outbound',
        text: '¡Hola Lucía! Claro, te lo reenvío ahora mismo.',
        at: '10:05',
      },
      {
        id: 'm3',
        direction: 'inbound',
        text: 'Gracias. ¿Me podrías reenviar el comprobante?',
        at: '10:11',
      },
    ],
  },
  {
    id: 'conv-2',
    name: 'Miguel Ortega',
    description: 'Soporte de dispositivo',
    status: 'pending',
    unread: 0,
    lastMessage: 'Gracias, queda resuelto.',
    lastAt: 'hace 1 h',
    assignee: 'María López',
    messages: [
      {
        id: 'm1',
        direction: 'inbound',
        text: 'El equipo no sincroniza desde ayer.',
        at: '09:12',
      },
      {
        id: 'm2',
        direction: 'outbound',
        text: 'Probemos reiniciando la aplicación.',
        at: '09:20',
      },
      {
        id: 'm3',
        direction: 'inbound',
        text: 'Gracias, queda resuelto.',
        at: '09:58',
      },
    ],
  },
  {
    id: 'conv-3',
    name: 'Cafetería Aurora',
    description: 'Pedido mayorista',
    status: 'open',
    unread: 1,
    lastMessage: '¿Tienen disponibilidad para el viernes?',
    lastAt: 'hace 3 h',
    assignee: 'Sin asignar',
    messages: [
      {
        id: 'm1',
        direction: 'inbound',
        text: 'Nos gustaría ampliar el pedido de esta semana.',
        at: '08:45',
      },
      {
        id: 'm2',
        direction: 'outbound',
        text: 'Perfecto, reviso disponibilidad y les confirmo.',
        at: '09:00',
      },
      {
        id: 'm3',
        direction: 'inbound',
        text: '¿Tienen disponibilidad para el viernes?',
        at: '11:22',
      },
    ],
  },
  {
    id: 'conv-4',
    name: 'Valentina Soto',
    description: 'Dudas sobre el servicio',
    status: 'resolved',
    unread: 0,
    lastMessage: '¡Muchas gracias por la ayuda!',
    lastAt: 'ayer',
    assignee: 'Carlos Ruiz',
    messages: [
      {
        id: 'm1',
        direction: 'inbound',
        text: '¿Cómo configuro las notificaciones?',
        at: '12:30',
      },
      {
        id: 'm2',
        direction: 'outbound',
        text: 'Te comparto la guía paso a paso.',
        at: '12:41',
      },
      {
        id: 'm3',
        direction: 'inbound',
        text: '¡Muchas gracias por la ayuda!',
        at: '13:05',
      },
    ],
  },
  {
    id: 'conv-5',
    name: 'Carlos Ramos',
    description: 'Renovación de contrato',
    status: 'open',
    unread: 0,
    lastMessage: '¿Puede alguien atender la renovación?',
    lastAt: 'hace 1 día',
    assignee: 'Sin asignar',
    messages: [
      {
        id: 'm1',
        direction: 'inbound',
        text: 'Quisiera revisar las condiciones antes de renovar.',
        at: '15:10',
      },
      {
        id: 'm2',
        direction: 'outbound',
        text: 'Por supuesto, coordino con el equipo comercial.',
        at: '15:20',
      },
      {
        id: 'm3',
        direction: 'inbound',
        text: '¿Puede alguien atender la renovación?',
        at: '17:44',
      },
    ],
  },
]