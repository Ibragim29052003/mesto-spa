import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react'
import { Calendar, Chevron, Close } from './Icons'
import { formatDate, isCalendarDate } from './booking'
import {
  calendarCells,
  calendarStart,
  fromCalendarDate,
  shiftDays,
  shiftMonth,
} from './calendar'

type Props = {
  value: string
  today: string
  onChange: (value: string) => void
  controlRef: RefObject<HTMLInputElement | null>
  error?: string
}
const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const fullWeekdays = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
]

export function DateField({
  value,
  today,
  onChange,
  controlRef,
  error,
}: Props) {
  const [focusedDay, setFocusedDay] = useState(() =>
    calendarStart(value, today),
  )
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const daysRef = useRef<HTMLTableElement>(null)
  const activeDay = calendarStart(focusedDay, today)
  const monthDate = fromCalendarDate(activeDay)
  const title = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
  }).format(monthDate)
  const cells = calendarCells(activeDay)
  const firstOfMonth = `${activeDay.slice(0, 7)}-01`
  const previousEnabled =
    shiftMonth(firstOfMonth, -1).slice(0, 7) >= today.slice(0, 7)
  const nextEnabled = activeDay.slice(0, 7) < '9999-12'

  useLayoutEffect(() => {
    if (!open) return
    const root = document.documentElement
    const body = document.body
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    const previousOverflow = root.style.overflow
    const previousBody = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
    }
    const scrollbarWidth = window.innerWidth - root.clientWidth
    const paddingRight =
      Number.parseFloat(getComputedStyle(body).paddingRight) || 0

    root.style.overflow = 'hidden'
    Object.assign(body.style, {
      position: 'fixed',
      top: `${-scrollY}px`,
      left: `${-scrollX}px`,
      width: '100%',
      paddingRight: `${paddingRight + scrollbarWidth}px`,
    })

    return () => {
      root.style.overflow = previousOverflow
      Object.assign(body.style, previousBody)
      // Restore the exact position without triggering the site's smooth scrolling.
      window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' })
    }
  }, [open])

  useEffect(() => {
    if (open)
      daysRef.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${activeDay}"]`)
        ?.focus()
  }, [open, activeDay])

  function showCalendar() {
    // A real touch device keeps its familiar OS picker. Missing/blocked showPicker falls back to our dialog.
    const input = controlRef.current
    if (
      window.matchMedia('(pointer: coarse)').matches &&
      input &&
      typeof input.showPicker === 'function'
    ) {
      try {
        input.showPicker()
        return
      } catch {
        /* Use the accessible custom calendar below. */
      }
    }
    setFocusedDay(calendarStart(value, today))
    dialogRef.current?.showModal()
    setOpen(true)
  }

  function close() {
    dialogRef.current?.close()
  }
  function choose(value: string) {
    onChange(value)
    close()
  }
  function move(value: string) {
    if (isCalendarDate(value) && value >= today && value <= '9999-12-31')
      setFocusedDay(value)
  }

  function keyboard(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const key = event.key
    let next: string | undefined
    if (key === 'ArrowLeft') next = shiftDays(date, -1)
    if (key === 'ArrowRight') next = shiftDays(date, 1)
    if (key === 'ArrowUp') next = shiftDays(date, -7)
    if (key === 'ArrowDown') next = shiftDays(date, 7)
    if (key === 'Home')
      next = shiftDays(date, -((fromCalendarDate(date).getDay() + 6) % 7))
    if (key === 'End')
      next = shiftDays(date, 6 - ((fromCalendarDate(date).getDay() + 6) % 7))
    if (key === 'PageUp') next = shiftMonth(date, event.shiftKey ? -12 : -1)
    if (key === 'PageDown') next = shiftMonth(date, event.shiftKey ? 12 : 1)
    if (next) {
      event.preventDefault()
      if (isCalendarDate(next)) move(next < today ? today : next)
    }
  }

  return (
    <>
      <div className="date-control">
        <input
          id="date"
          ref={controlRef}
          type="date"
          name="date"
          required
          min={today}
          max="9999-12-31"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={`date-hint${error ? ' date-error' : ''}`}
        />
        <button
          type="button"
          ref={triggerRef}
          className="calendar-trigger"
          aria-label="Открыть календарь"
          aria-haspopup="dialog"
          aria-controls="date-calendar"
          onClick={showCalendar}
        >
          <Calendar />
        </button>
      </div>
      <dialog
        id="date-calendar"
        className="calendar-dialog"
        ref={dialogRef}
        aria-labelledby="calendar-title"
        aria-describedby="calendar-description"
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              'button:not(:disabled)',
            ),
          ).filter((button) => button.tabIndex >= 0)
          const first = controls[0]
          const last = controls[controls.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last?.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }}
        onClose={() => {
          setOpen(false)
          triggerRef.current?.focus({ preventScroll: true })
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return
          const rect = event.currentTarget.getBoundingClientRect()
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            close()
        }}
      >
        <div className="calendar-dialog-heading">
          <span className="eyebrow">ВРЕМЯ ДЛЯ СЕБЯ</span>
          <button
            type="button"
            className="icon-button"
            aria-label="Закрыть календарь"
            onClick={close}
          >
            <Close />
          </button>
        </div>
        <h3 id="calendar-title">Выберите день.</h3>
        <p id="calendar-description">Сегодня или когда захочется выдохнуть.</p>
        <div className="calendar-navigation">
          <button
            type="button"
            className="icon-button"
            aria-label="Предыдущий месяц"
            disabled={!previousEnabled}
            onClick={() =>
              move(
                shiftMonth(activeDay, -1) < today
                  ? today
                  : shiftMonth(activeDay, -1),
              )
            }
          >
            <Chevron direction="left" />
          </button>
          <h4 id="calendar-month" aria-live="polite">
            {title}
          </h4>
          <button
            type="button"
            className="icon-button"
            aria-label="Следующий месяц"
            disabled={!nextEnabled}
            onClick={() => move(shiftMonth(activeDay, 1))}
          >
            <Chevron direction="right" />
          </button>
        </div>
        <table
          className="calendar-grid"
          ref={daysRef}
          role="grid"
          aria-labelledby="calendar-month"
          aria-describedby="calendar-keyboard"
        >
          <thead>
            <tr>
              {weekdays.map((day, index) => (
                <th key={day} scope="col" abbr={fullWeekdays[index]}>
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: cells.length / 7 }, (_, week) => (
              <tr key={week}>
                {cells.slice(week * 7, week * 7 + 7).map((date, index) => (
                  <td
                    key={date ?? `empty-${index}`}
                    aria-selected={date ? date === value : undefined}
                  >
                    {date && (
                      <button
                        type="button"
                        data-date={date}
                        aria-label={formatDate(date)}
                        aria-current={date === today ? 'date' : undefined}
                        className={`calendar-day${date === value ? ' is-selected' : ''}${date === today ? ' is-today' : ''}`}
                        disabled={date < today}
                        tabIndex={date === activeDay ? 0 : -1}
                        onFocus={() => setFocusedDay(date)}
                        onKeyDown={(event) => keyboard(event, date)}
                        onClick={() => choose(date)}
                      >
                        {Number(date.slice(8, 10))}
                      </button>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="calendar-footer">
          <button
            type="button"
            className="calendar-today"
            onClick={() => choose(today)}
          >
            Выбрать сегодня
          </button>
          <span>
            <span className="today-dot" /> Сегодня
          </span>
        </div>
        <p className="sr-only" id="calendar-keyboard">
          Стрелки — по дням, Home и End — начало и конец недели, Page Up и Page
          Down — по месяцам. Shift с Page Up или Page Down — по годам. Enter —
          выбрать, Escape — закрыть.
        </p>
      </dialog>
    </>
  )
}
