export * from './tokens'
export { Eyebrow } from './Eyebrow'
export { PageHeader, SerifTitle } from './PageHeader'
export { Card } from './Card'
export { Badge, StatusBadge } from './Badge'
export { Button, buttonStyle, buttonClass } from './Button'
export type { BtnVariant, BtnSize } from './Button'
export { Label, Input, Textarea, Select, fieldStyle } from './Field'
export { SegmentedToggle } from './SegmentedToggle'
export type { SegOption } from './SegmentedToggle'
export { Switch } from './Switch'
export { TabBar } from './TabBar'
export type { TabItem } from './TabBar'
export { Modal } from './Modal'
export { AppPagina } from './AppPagina'
export { StatTile } from './StatTile'
export { EmptyState } from './EmptyState'
export { Skeleton, SkeletonRij } from './Skeleton'

// Radix-gebaseerde interactieprimitives (item 6.0, roadmap § 3.8). Zelf bouwen
// mag alleen wat Radix niet levert — deze zes geven focus-trap, Escape,
// scroll-lock, botsingscorrectie en toetsenbordnavigatie die handwerk mist.
export { Sheet } from './Sheet'
export { Popover } from './Popover'
export { Slider } from './Slider'
export { Tooltip, TooltipProvider } from './Tooltip'
export { SelectMenu } from './SelectMenu'
export type { SelectOptie } from './SelectMenu'
export { Tabs } from './Tabs'
export type { TabDef } from './Tabs'

// Item 6.1 (Marktanalyse-explorer v2, roadmap § 3.7/3.8): FilterBar-bouwstenen
// en chart-primitives, geëxporteerd voor hergebruik door de volgende
// verkenners (6.2 Transacties, 6.3 Concurrentie).
export { Chip } from './Chip'
export { Checkbox } from './Checkbox'
export { FilterBar } from './FilterBar'
export { FilterDropdown } from './FilterDropdown'
export { FilterPills } from './FilterPills'
export type { FilterPil } from './FilterPills'
export { RangeSlider } from './RangeSlider'
export { ChartCard, Legenda } from './ChartCard'

// Item 6.2 (Transacties opzoeken v2, roadmap § 3.8): TanStack Table-primitive
// voor server-gepagineerde datatabellen — herbruikbaar door latere lijst-
// schermen (bv. fase 10 dossierlijst).
export { DataTable, dataTableFeatures } from './DataTable'
export type { DataTableKolom, DataTableSortering, DataTablePaginatie } from './DataTable'

// Item 6.3 (Concurrentie-explorer v2): wij-vs-markt-vergelijking, poort van
// docs/ontwerp/concurrentie.html bouwDumbbell() — herbruikbaar voor elke
// twee-punts-vergelijking (looptijd, t.o.v. vraagprijs, € per m²).
export { DumbbellStat } from './DumbbellStat'
