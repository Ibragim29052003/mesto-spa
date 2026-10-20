import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Arrow, Check, Emblem } from './Icons'
import { ProgramSelect } from './ProgramSelect'
import { DateField } from './DateField'
import {
  PROGRAMS,
  NAME_MAX_LENGTH,
  formatDate,
  getProgram,
  localDate,
  money,
  readBooking,
  removeBooking,
  saveBooking,
  validate,
  type Booking,
  type Draft,
  type Errors,
  type ProgramId,
} from './booking'

export default function App() {
  const [initial] = useState(readBooking)
  const [saved, setSaved] = useState<Booking | null>(initial.booking)
  const [editing, setEditing] = useState(!initial.booking)
  const [draft, setDraft] = useState<Draft>(
    initial.booking ?? { name: '', programId: '', date: '' },
  )
  const [errors, setErrors] = useState<Errors>({})
  const [storageIssue, setStorageIssue] = useState(initial.issue)
  const [notice, setNotice] = useState('')
  const [selectionNotice, setSelectionNotice] = useState('')
  const [today, setToday] = useState(localDate)
  const nameRef = useRef<HTMLInputElement>(null)
  const programRef = useRef<HTMLButtonElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)
  const confirmationRef = useRef<HTMLDivElement>(null)
  const focusConfirmation = useRef(false)
  const submitLock = useRef(false)
  const selected = getProgram(draft.programId)

  useEffect(() => {
    if (!editing && focusConfirmation.current) {
      confirmationRef.current?.focus()
      focusConfirmation.current = false
    }
  }, [editing])

  // A tab can remain open across midnight. Refresh min on focus and recheck on submit.
  useEffect(() => {
    const refresh = () => setToday(localDate())
    window.addEventListener('focus', refresh)
    const timer = window.setInterval(refresh, 60_000)
    return () => {
      window.removeEventListener('focus', refresh)
      window.clearInterval(timer)
    }
  }, [])

  function update(field: keyof Draft, value: string) {
    const next = { ...draft, [field]: value }
    setDraft(next)
    if (errors[field])
      setErrors((previous) => ({ ...previous, [field]: validate(next)[field] }))
    setNotice('')
  }

  function choose(id: ProgramId) {
    setDraft((previous) => ({ ...previous, programId: id }))
    setErrors((previous) => ({ ...previous, programId: undefined }))
    setSelectionNotice(`Выбрана программа «${getProgram(id)?.name}».`)
    setEditing(true)
    submitLock.current = false
    setNotice('')
    requestAnimationFrame(() =>
      nameRef.current?.focus({ preventScroll: false }),
    )
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitLock.current) return
    const currentDay = localDate()
    setToday(currentDay)
    const nextErrors = validate(draft, currentDay)
    setErrors(nextErrors)
    const firstInvalid = (['name', 'programId', 'date'] as const).find(
      (field) => nextErrors[field],
    )
    if (firstInvalid) {
      const refs = { name: nameRef, programId: programRef, date: dateRef }
      requestAnimationFrame(() => refs[firstInvalid].current?.focus())
      return
    }
    const program = getProgram(draft.programId)
    if (!program) return
    submitLock.current = true
    const booking: Booking = {
      version: 1,
      name: draft.name.trim(),
      programId: program.id,
      date: draft.date,
    }
    if (!saveBooking(booking)) {
      setStorageIssue('unavailable')
      setNotice(
        'Не удалось сохранить заявку в браузере. Разрешите локальное хранилище в настройках браузера и попробуйте ещё раз. Данные остались в форме.',
      )
      submitLock.current = false
      return
    }
    setSaved(booking)
    setStorageIssue(null)
    setNotice('')
    focusConfirmation.current = true
    setEditing(false)
  }

  function editSaved() {
    if (saved) setDraft(saved)
    setErrors({})
    setNotice('')
    setEditing(true)
    submitLock.current = false
    requestAnimationFrame(() => nameRef.current?.focus())
  }

  function clearSaved() {
    if (!removeBooking()) {
      setNotice(
        'Не удалось удалить заявку: хранилище браузера недоступно. Попробуйте ещё раз.',
      )
      return
    }
    setSaved(null)
    setDraft({ name: '', programId: '', date: '' })
    setErrors({})
    setNotice('Заявка удалена из этого браузера.')
    setEditing(true)
    submitLock.current = false
    requestAnimationFrame(() => nameRef.current?.focus())
  }

  const savedProgram = saved ? getProgram(saved.programId) : undefined

  return (
    <>
      <a className="skip-link" href="#main">
        Перейти к содержимому
      </a>
      <header className="header shell">
        <a className="brand" href="#" aria-label="Место SPA — на главную">
          <Emblem />
          <span>
            место <span className="brand-spa">SPA</span>
          </span>
        </a>
        <nav aria-label="Основная навигация">
          <a href="#programs">Программы</a>
          <a href="#approach">О пространстве</a>
        </nav>
        <a className="header-action" href="#booking">
          {saved ? 'Моя заявка' : 'Выбрать время'}
          <Arrow diagonal />
        </a>
      </header>

      <main id="main">
        <section className="hero shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="small-line" /> SPA-СТУДИЯ · МОСКВА
            </p>
            <h1 id="hero-title">
              Место, где
              <br />
              можно просто
              <br />
              <em>быть собой.</em>
            </h1>
            <p className="hero-description">
              Оставьте городской ритм за дверью.
              <br className="desktop-break" /> Три программы, чтобы выдохнуть,
              <br className="desktop-break" /> замедлиться и вернуться к себе.
            </p>
            <a className="button primary hero-cta" href="#programs">
              Найти свою программу
              <Arrow />
            </a>
            <p className="hero-caption">
              Для себя. Для близких. Для вашего спокойствия.
            </p>
            <div className="hero-bottom">
              <span>01 — ВРЕМЯ ДЛЯ СЕБЯ</span>
              <span className="scroll-cue">
                Листайте медленно <span aria-hidden="true">↓</span>
              </span>
            </div>
          </div>
          <figure className="hero-visual">
            <img
              src="./images/spa-interior.webp"
              srcSet="./images/spa-interior-small.webp 640w, ./images/spa-interior.webp 1200w"
              sizes="(max-width: 700px) 100vw, 50vw"
              width="1200"
              height="1499"
              alt="Иллюстрация SPA-пространства: светлый камень, вода и мягкий солнечный свет"
              fetchPriority="high"
            />
            <div className="image-label">
              <span className="label-star" aria-hidden="true">
                ✳
              </span>
              <span>
                Искусство
                <br />
                ничего не спешить.
              </span>
            </div>
            <figcaption>Визуальный образ вымышленной студии</figcaption>
          </figure>
        </section>

        <section
          className="intro shell"
          id="approach"
          aria-labelledby="approach-title"
        >
          <div className="intro-label">
            <span className="eyebrow">МЕНЬШЕ СУЕТЫ. БОЛЬШЕ ВАС.</span>
            <Emblem />
          </div>
          <div>
            <h2 id="approach-title">
              Иногда лучший план —<br />
              <em>немного остановиться.</em>
            </h2>
            <p>
              Тепло, прикосновения и тишина. Мы придумали «Место»,
              <br className="desktop-break" /> где отдых не нужно заслуживать.
              Достаточно выбрать
              <br className="desktop-break" /> время, которое вы хотите подарить
              себе.
            </p>
          </div>
        </section>

        <section
          className="programs-section"
          id="programs"
          aria-labelledby="programs-title"
        >
          <div className="shell">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ВАШ РИТУАЛ СПОКОЙСТВИЯ</p>
                <h2 id="programs-title">
                  Как вы хотите <em>отдохнуть?</em>
                </h2>
              </div>
              <p className="section-note">
                Три программы. Одно намерение —<br />
                позаботиться о себе.
              </p>
            </div>
            <div className="program-grid">
              {PROGRAMS.map((program, index) => (
                <article
                  key={program.id}
                  className={`program-card${program.id === 'deep' ? ' featured' : ''}`}
                >
                  <div className="card-top">
                    <span className="card-index">0{index + 1}</span>
                    <span className="card-person">{program.people}</span>
                    <Emblem kind={program.icon} />
                  </div>
                  <p className="card-mood">{program.mood}</p>
                  <h3>{program.name}</h3>
                  <p className="card-description">{program.description}</p>
                  <ul>
                    {program.steps.map((step) => (
                      <li key={step}>
                        <Check />
                        {step}
                      </li>
                    ))}
                  </ul>
                  <div className="program-meta">
                    <span>
                      {program.duration}
                      <small> минут</small>
                    </span>
                    <strong>{money(program.price)}</strong>
                  </div>
                  <button
                    type="button"
                    className="button card-button"
                    onClick={() => choose(program.id)}
                    aria-label={`Выбрать программу «${program.name}»`}
                  >
                    Выбрать программу
                    <Arrow />
                  </button>
                  <p className="card-footnote">
                    {program.id === 'duo'
                      ? 'Стоимость за двоих'
                      : 'Стоимость за одного гостя'}
                  </p>
                </article>
              ))}
            </div>
            <p className="programs-footnote">
              Наполнение программ — часть концепции учебного проекта.
            </p>
          </div>
        </section>

        <section
          className="booking-section shell"
          id="booking"
          aria-labelledby="booking-title"
        >
          <div className="booking-copy">
            <p className="eyebrow">СЛЕДУЮЩИЙ ШАГ — ПАУЗА</p>
            <h2 id="booking-title">
              Оставьте время
              <br />
              <em>для себя.</em>
            </h2>
            <p>
              Выберите программу и день,
              <br />
              который хочется посвятить отдыху.
            </p>
            <div className="demo-note">
              <span className="note-symbol" aria-hidden="true">
                i
              </span>
              <p>
                <strong>Это демонстрационная заявка.</strong> Она сохранится
                только в вашем браузере. В студию ничего не отправляется,
                настоящее время не бронируется. Используйте вымышленное имя.
              </p>
            </div>
            <span className="booking-flower">
              <Emblem />
            </span>
          </div>
          <div className="booking-panel">
            {storageIssue === 'invalid' && (
              <p className="storage-warning" role="status">
                Предыдущую заявку не удалось прочитать. Заполните новую — она
                заменит повреждённые данные.
              </p>
            )}
            {storageIssue === 'unavailable' && !notice && (
              <p className="storage-warning" role="status">
                Локальное хранилище недоступно. Для сохранения заявки разрешите
                его в настройках браузера.
              </p>
            )}
            {editing ? (
              <form
                onSubmit={submit}
                noValidate
                aria-label="Демонстрационная заявка"
              >
                <div className="form-heading">
                  <span>ВАША ПАУЗА НАЧИНАЕТСЯ ЗДЕСЬ</span>
                  <span aria-hidden="true">↗</span>
                </div>
                <p className="form-required">Все поля обязательны</p>
                <div className="field">
                  <label htmlFor="name">Как к вам обращаться</label>
                  <input
                    id="name"
                    ref={nameRef}
                    name="name"
                    autoComplete="off"
                    placeholder="Например, Саша"
                    maxLength={NAME_MAX_LENGTH}
                    required
                    value={draft.name}
                    onChange={(event) => update('name', event.target.value)}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                  />
                  {errors.name && (
                    <p className="field-error" id="name-error">
                      {errors.name}
                    </p>
                  )}
                </div>
                <div className="field">
                  <label id="program-label" htmlFor="program">
                    Ваша программа
                  </label>
                  <ProgramSelect
                    value={draft.programId}
                    controlRef={programRef}
                    onChange={(value) => update('programId', value)}
                    error={errors.programId}
                  />
                  {errors.programId && (
                    <p className="field-error" id="program-error">
                      {errors.programId}
                    </p>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="date">Желаемая дата</label>
                  <DateField
                    value={draft.date}
                    today={today}
                    controlRef={dateRef}
                    onChange={(value) => update('date', value)}
                    error={errors.date}
                  />
                  <p className="field-hint" id="date-hint">
                    Сегодня или любой день в будущем.
                  </p>
                  {errors.date && (
                    <p className="field-error" id="date-error">
                      {errors.date}
                    </p>
                  )}
                </div>
                {selected && (
                  <div className="form-total">
                    <span>
                      {selected.duration} минут{' '}
                      {selected.id === 'duo' ? 'для двоих' : 'для себя'}
                    </span>
                    <strong>{money(selected.price)}</strong>
                  </div>
                )}
                <button className="button primary submit-button" type="submit">
                  Сохранить демо-заявку
                  <Arrow />
                </button>
                <p className="form-privacy">
                  Без оплаты и отправки данных. Можно изменить
                  <br className="desktop-break" /> или удалить сохранённую
                  заявку.
                </p>
              </form>
            ) : (
              saved &&
              savedProgram && (
                <div
                  className="confirmation"
                  ref={confirmationRef}
                  tabIndex={-1}
                  aria-labelledby="confirmation-title"
                >
                  <span className="success-icon">
                    <Check />
                  </span>
                  <p className="eyebrow">ВАША МАЛЕНЬКАЯ ПАУЗА</p>
                  <h3 id="confirmation-title">
                    Заявка сохранена
                    <br />
                    <em>в этом браузере.</em>
                  </h3>
                  <p className="confirmation-description">
                    {saved.name}, вот детали вашей демо-заявки. Они останутся
                    здесь после обновления страницы.
                  </p>
                  <dl>
                    <div>
                      <dt>Программа</dt>
                      <dd>{savedProgram.name}</dd>
                    </div>
                    <div>
                      <dt>Желаемая дата</dt>
                      <dd>{formatDate(saved.date)}</dd>
                    </div>
                    <div>
                      <dt>Длительность</dt>
                      <dd>{savedProgram.duration} минут</dd>
                    </div>
                    <div>
                      <dt>
                        Стоимость{saved.programId === 'duo' ? ' за двоих' : ''}
                      </dt>
                      <dd>{money(savedProgram.price)}</dd>
                    </div>
                  </dl>
                  <p className="confirmation-note">
                    Это демо: заявка не отправлена в студию, время не
                    забронировано.
                  </p>
                  <button
                    type="button"
                    className="button primary"
                    onClick={editSaved}
                  >
                    Изменить заявку
                    <Arrow />
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={clearSaved}
                  >
                    Удалить из браузера
                  </button>
                </div>
              )
            )}
            {notice && (
              <p className="storage-warning" role="status">
                {notice}
              </p>
            )}
          </div>
        </section>
        <div className="closing shell">
          <span aria-hidden="true">✳</span>
          <p>
            Вы всегда можете
            <br /> <em>начать с паузы.</em>
          </p>
          <a href="#programs" aria-label="Вернуться к выбору программ">
            <Arrow diagonal />
          </a>
        </div>
      </main>
      <footer className="footer shell">
        <a className="footer-wordmark" href="#">
          место<span>SPA</span>
        </a>
        <p>
          Вымышленная SPA-студия · Москва
          <br />
          Учебный проект. Не является предложением услуг.
        </p>
        <a href="#booking">
          Время для себя
          <Arrow diagonal />
        </a>
      </footer>
      <p className="sr-only" role="status" aria-live="polite">
        {selectionNotice}
      </p>
    </>
  )
}
