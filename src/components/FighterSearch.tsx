import { useState, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Combobox, InputBase, useCombobox, Group, Badge } from '@mantine/core'
import type { Doc } from '../../convex/_generated/dataModel'
import classes from './FighterSearch.module.css'

interface FighterSearchProps {
  label: string
  value: Doc<'fighters'> | null
  onChange: (fighter: Doc<'fighters'>) => void
  exclude?: string
}

export default function FighterSearch({ label, value, onChange, exclude }: FighterSearchProps) {
  const [query, setQuery] = useState('')
  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() })

  const allFighters = useQuery(api.fighters.getAllFighters) as Doc<'fighters'>[] | undefined

  const filtered = useMemo(() => {
    if (!allFighters) return []
    const q = query.toLowerCase().trim()
    return allFighters
      .filter((f) => f._id !== exclude)
      .filter((f) => !q || f.name.toLowerCase().includes(q))
      .slice(0, 20)
  }, [allFighters, query, exclude])

  const options = filtered.map((f) => (
    <Combobox.Option value={f._id} key={f._id}>
      <Group gap={8} wrap="nowrap">
        {f.photoUrl && (
          <img src={f.photoUrl} alt={f.name} className={classes.optionThumb} />
        )}
        <span className={classes.optionName}>
          {f.name}
        </span>
        <Badge size="xs" color="ufcRed" variant="light" radius="xs">
          {f.ranking === 0 ? 'C' : f.ranking !== undefined ? `#${f.ranking}` : 'NR'}
        </Badge>
      </Group>
    </Combobox.Option>
  ))

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(id) => {
        const fighter = allFighters?.find((f) => f._id === id)
        if (fighter) {
          onChange(fighter)
          setQuery('')
        }
        combobox.closeDropdown()
      }}
    >
      <Combobox.Target>
        <InputBase
          label={label}
          placeholder="Search fighter…"
          value={combobox.dropdownOpened ? query : (value?.name ?? '')}
          onChange={(e) => { setQuery(e.currentTarget.value); combobox.openDropdown() }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => { combobox.closeDropdown(); setQuery('') }}
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
          classNames={{ label: classes.label, input: classes.input }}
        />
      </Combobox.Target>

      <Combobox.Dropdown classNames={{ dropdown: classes.dropdown }}>
        <Combobox.Options>
          {options.length > 0 ? options : (
            <Combobox.Empty className={classes.empty}>No fighters found</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  )
}
