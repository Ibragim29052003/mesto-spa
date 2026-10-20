import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from 'react'
import { Check, Chevron } from './Icons'
import { PROGRAMS, getProgram, money, type ProgramId } from './booking'

type Props = {
  value: string
  onChange: (value: ProgramId) => void
  controlRef: Ref<HTMLButtonElement>
  error?: string
}

export function ProgramSelect({ value, onChange, controlRef, error }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [placement, setPlacement] = useState({ side: 'bottom', height: 272 })
  const rootRef = useRef<HTMLDivElement>(null)
  const search = useRef({ text: '', time: 0 })
  const selected = getProgram(value)

  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      )
        setOpen(false)
    }
    const dismissOnResize = () => setOpen(false)
    document.addEventListener('pointerdown', dismiss)
    window.addEventListener('resize', dismissOnResize)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('resize', dismissOnResize)
    }
  }, [open])

  useEffect(() => {
    if (open)
      document
        .getElementById(`program-option-${active}`)
        ?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  function expand(
    index = Math.max(
      0,
      PROGRAMS.findIndex((program) => program.id === value),
    ),
  ) {
    positionList()
    setActive(index)
    setOpen(true)
    search.current = { text: '', time: 0 }
  }

  function positionList() {
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return
    const below = window.innerHeight - rect.bottom - 14
    const above = rect.top - 14
    const side = below < 260 && above > below ? 'top' : 'bottom'
    setPlacement({
      side,
      height: Math.min(272, Math.max(86, side === 'top' ? above : below)),
    })
  }

  function commit(index: number) {
    const program = PROGRAMS[index]
    if (program) onChange(program.id)
    setOpen(false)
  }

  function keyboard(event: KeyboardEvent<HTMLButtonElement>) {
    const { key } = event
    if (
      ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' ', 'Escape'].includes(
        key,
      )
    )
      event.preventDefault()
    if (key === 'Escape') {
      setOpen(false)
      return
    }
    if (key === 'Tab') {
      if (open) commit(active)
      return
    }
    if (key === 'Enter' || key === ' ') {
      if (open) commit(active)
      else expand()
      return
    }
    if (key === 'Home' || key === 'End') {
      expand(key === 'Home' ? 0 : PROGRAMS.length - 1)
      return
    }
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      if (!open) expand()
      else if (event.altKey && key === 'ArrowUp') commit(active)
      else
        setActive((previous) =>
          Math.min(
            PROGRAMS.length - 1,
            Math.max(0, previous + (key === 'ArrowDown' ? 1 : -1)),
          ),
        )
      return
    }
    if (key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault()
      const now = Date.now()
      const character = key.toLocaleLowerCase('ru-RU')
      const prefix =
        now - search.current.time < 700
          ? search.current.text + character
          : character
      search.current = { text: prefix, time: now }
      const index = PROGRAMS.findIndex((program) =>
        program.name.toLocaleLowerCase('ru-RU').startsWith(prefix),
      )
      if (index >= 0) {
        if (!open) positionList()
        setActive(index)
        setOpen(true)
      }
    }
  }

  return (
    <div className="program-select" ref={rootRef}>
      <button
        id="program"
        ref={controlRef}
        type="button"
        role="combobox"
        className={`select-control${selected ? ' has-selection' : ''}`}
        aria-labelledby="program-label"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="program-options"
        aria-activedescendant={open ? `program-option-${active}` : undefined}
        aria-required="true"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'program-error' : undefined}
        onClick={() => {
          if (open) setOpen(false)
          else expand()
        }}
        onKeyDown={keyboard}
        onBlur={(event) => {
          if (!event.currentTarget.parentElement?.contains(event.relatedTarget))
            setOpen(false)
        }}
      >
        <span className="select-value">
          <span>{selected?.name ?? 'Выберите программу'}</span>
          {selected && (
            <span className="select-value-meta">
              {selected.duration} мин <span aria-hidden="true">·</span>{' '}
              {money(selected.price)}
            </span>
          )}
        </span>
        <Chevron direction={open ? 'up' : 'down'} />
      </button>
      <input type="hidden" name="program" value={value} />
      <ul
        id="program-options"
        className="program-options"
        role="listbox"
        data-side={placement.side}
        style={{ maxHeight: placement.height }}
        aria-labelledby="program-label"
        hidden={!open}
      >
        {PROGRAMS.map((program, index) => (
          <li
            key={program.id}
            id={`program-option-${index}`}
            role="option"
            aria-selected={open ? active === index : program.id === value}
            className={`program-option${active === index ? ' is-active' : ''}${program.id === value ? ' is-selected' : ''}`}
            onPointerDown={(event) => event.preventDefault()}
            onPointerMove={() => setActive(index)}
            onClick={() => commit(index)}
          >
            <span className="option-copy">
              <span className="option-name">{program.name}</span>
              <span className="option-details">
                {program.duration} минут <span aria-hidden="true">·</span>{' '}
                {program.people.toLocaleLowerCase('ru-RU')}
              </span>
            </span>
            <span className="option-price">{money(program.price)}</span>
            <span className="option-check">
              {program.id === value && <Check />}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
