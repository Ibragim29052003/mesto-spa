import { isCalendarDate, localDate } from './booking'

export function fromCalendarDate(value: string): Date {
  return new Date(
    Number(value.slice(0, 4)),
    Number(value.slice(5, 7)) - 1,
    Number(value.slice(8, 10)),
  )
}

export function shiftDays(value: string, days: number): string {
  const date = fromCalendarDate(value)
  date.setDate(date.getDate() + days)
  return localDate(date)
}

export function shiftMonth(value: string, months: number): string {
  const date = fromCalendarDate(value)
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate()
  target.setDate(Math.min(date.getDate(), lastDay))
  return localDate(target)
}

export function calendarCells(value: string): (string | null)[] {
  const date = fromCalendarDate(value)
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7 // Monday first.
  const count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const length = Math.ceil((offset + count) / 7) * 7
  return Array.from({ length }, (_, index) => {
    const day = index - offset + 1
    return day < 1 || day > count
      ? null
      : localDate(new Date(date.getFullYear(), date.getMonth(), day))
  })
}

export function calendarStart(value: string, today: string): string {
  return isCalendarDate(value) && value >= today ? value : today
}
