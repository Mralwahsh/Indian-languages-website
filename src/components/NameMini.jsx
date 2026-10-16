import { useVisitor } from '../context/VisitorContext.jsx'

/** Small name field so visitors can start right from the map. */
export default function NameMini({ compact = false }) {
  const { name, setName } = useVisitor()
  return (
    <input
      value={name}
      onChange={(e) => setName(e.target.value)}
      dir="auto"
      maxLength={30}
      spellCheck={false}
      autoComplete="off"
      placeholder="اكتب اسمك هنا"
      className={`${compact ? 'mt-3 h-14 text-2xl' : 'mt-8 h-20 text-4xl'} w-full rounded-full bg-cream px-8 text-center font-bold ring-2 ring-ink/10 outline-none placeholder:font-semibold placeholder:text-ink/25 focus:ring-4 focus:ring-saffron/60`}
    />
  )
}
