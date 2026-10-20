export const PROGRAMS = [
  {
    id: 'reset',
    name: 'Перезагрузка',
    duration: 60,
    price: 3500,
    people: 'Для одного',
    mood: 'Выдохнуть после долгой недели',
    description:
      'Час, чтобы замедлиться, отпустить суету и снова почувствовать лёгкость.',
    steps: ['Мягкое прогревание', 'Расслабляющий массаж', 'Травяной чай'],
    icon: 'sun',
  },
  {
    id: 'deep',
    name: 'Глубокий отдых',
    duration: 90,
    price: 5000,
    people: 'Для одного',
    mood: 'Побыть в своём ритме',
    description:
      'Больше времени для себя. Тепло, неспешные ритуалы и ни одной лишней мысли.',
    steps: ['Мягкое прогревание', 'Массаж и уход за телом', 'Чайная пауза'],
    icon: 'wave',
  },
  {
    id: 'duo',
    name: 'Для двоих',
    duration: 120,
    price: 9000,
    people: 'Для двух гостей',
    mood: 'Разделить момент спокойствия',
    description:
      'Время вдвоём, вдали от повседневных дел. Для близкого человека или в подарок.',
    steps: ['Совместный SPA-ритуал', 'Расслабляющий массаж', 'Чай для двоих'],
    icon: 'petals',
  },
] as const

export type ProgramId = (typeof PROGRAMS)[number]['id']
export type Draft = { name: string; programId: string; date: string }
export type Booking = {
  version: 1
  name: string
  programId: ProgramId
  date: string
}
export type Errors = Partial<Record<keyof Draft, string>>
export const STORAGE_KEY = 'mesto-spa.booking.v1'
export const NAME_MAX_LENGTH = 80
export const getProgram = (id: string) =>
  PROGRAMS.find((program) => program.id === id)
export const money = (value: number) =>
  `${new Intl.NumberFormat('ru-RU').format(value)} ₽`

// Calendar dates stay in local time; no toISOString() / UTC conversion.
export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  if (year < 1000 || year > 9999) return false
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(
    new Date(
      Number(value.slice(0, 4)),
      Number(value.slice(5, 7)) - 1,
      Number(value.slice(8, 10)),
    ),
  )
}

export function validate(draft: Draft, today = localDate()): Errors {
  const errors: Errors = {}
  if (!draft.name.trim()) errors.name = 'Введите имя — достаточно одного слова.'
  else if (draft.name.trim().length > NAME_MAX_LENGTH)
    errors.name = `Имя должно быть не длиннее ${NAME_MAX_LENGTH} символов.`
  if (!getProgram(draft.programId))
    errors.programId = 'Выберите одну из трёх программ.'
  if (!draft.date) errors.date = 'Выберите желаемую дату.'
  else if (!isCalendarDate(draft.date))
    errors.date = 'Укажите корректную календарную дату.'
  else if (draft.date < today)
    errors.date = 'Эта дата уже прошла. Выберите сегодня или другой день.'
  return errors
}

export type StorageRead = {
  booking: Booking | null
  issue: 'invalid' | 'unavailable' | null
}
type StorageAccess = () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const browserStorage: StorageAccess = () => window.localStorage

export function readBooking(
  access: StorageAccess = browserStorage,
): StorageRead {
  try {
    const raw = access().getItem(STORAGE_KEY)
    if (raw === null) return { booking: null, issue: null }
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null)
      return { booking: null, issue: 'invalid' }
    const record = data as Record<string, unknown>
    if (
      record.version !== 1 ||
      typeof record.name !== 'string' ||
      !record.name.trim() ||
      record.name.trim().length > NAME_MAX_LENGTH ||
      typeof record.programId !== 'string' ||
      !getProgram(record.programId) ||
      !isCalendarDate(record.date)
    ) {
      return { booking: null, issue: 'invalid' }
    }
    // Whitelist fields rather than retaining arbitrary stored properties.
    return {
      booking: {
        version: 1,
        name: record.name.trim(),
        programId: record.programId as ProgramId,
        date: record.date,
      },
      issue: null,
    }
  } catch (error) {
    return {
      booking: null,
      issue: error instanceof SyntaxError ? 'invalid' : 'unavailable',
    }
  }
}

export function saveBooking(
  booking: Booking,
  access: StorageAccess = browserStorage,
): boolean {
  try {
    access().setItem(STORAGE_KEY, JSON.stringify(booking))
    return true
  } catch {
    return false
  }
}

export function removeBooking(access: StorageAccess = browserStorage): boolean {
  try {
    access().removeItem(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
