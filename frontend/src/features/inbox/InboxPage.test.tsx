import { afterEach, describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import InboxPage from './InboxPage.tsx'
import { MOCK_CONVERSATIONS } from '../../data/mockConversations.ts'
import { renderWithProviders } from '../../test/renderWithProviders.tsx'
import { setViewportWidth } from '../../test/setup.ts'

const first = MOCK_CONVERSATIONS[0]
const second = MOCK_CONVERSATIONS[1]

afterEach(() => {
  setViewportWidth(1024)
})

describe('InboxPage', () => {
  it('muestra la lista de conversaciones de demostración', () => {
    renderWithProviders(<InboxPage />)

    for (const conversation of MOCK_CONVERSATIONS) {
      expect(screen.getAllByText(conversation.name).length).toBeGreaterThan(0)
    }
  })

  it('seleccionar una conversación muestra su historial', () => {
    renderWithProviders(<InboxPage />)

    fireEvent.click(screen.getByRole('button', { name: new RegExp(second.name) }))

    expect(screen.getByText(second.messages[0].text)).toBeInTheDocument()
    expect(screen.getByText(second.messages[1].text)).toBeInTheDocument()
  })

  it('la búsqueda filtra la lista', () => {
    renderWithProviders(<InboxPage />)

    fireEvent.change(
      screen.getByRole('textbox', { name: 'Buscar conversaciones' }),
      { target: { value: second.name } },
    )

    expect(screen.queryByText(first.name)).not.toBeInTheDocument()
    expect(screen.getAllByText(second.name).length).toBeGreaterThan(0)
  })

  it('muestra el estado vacío cuando la búsqueda no tiene resultados', () => {
    renderWithProviders(<InboxPage />)

    fireEvent.change(
      screen.getByRole('textbox', { name: 'Buscar conversaciones' }),
      { target: { value: 'zzzzzz' } },
    )

    expect(screen.getByText('Sin resultados')).toBeInTheDocument()
  })

  it('el compositor está deshabilitado (integración pendiente)', () => {
    renderWithProviders(<InboxPage />)

    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  })

  it('en móvil muestra la lista o el historial, no ambos a la vez', () => {
    setViewportWidth(375)
    renderWithProviders(<InboxPage />)

    expect(
      screen.getByRole('textbox', { name: 'Buscar conversaciones' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: new RegExp(first.name) }))

    expect(
      screen.getByRole('button', { name: 'Volver a la lista de conversaciones' }),
    ).toBeInTheDocument()
  })
})