const STAGE_ORDER = ['milestones', 'starforge', 'ascension', 'transcendence']

export function getBlueprintStageValue(progress = {}, stageKey = '') {
  const parsed = Number(progress?.[stageKey])
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export function getBlueprintStageOptions(stageKey = '', progress = {}, entries = []) {
  const stageIndex = STAGE_ORDER.indexOf(stageKey)
  const options = [{ value: 0, label: 'Not started' }]
  const skipPreviousStageLock = stageKey === 'starforge'

  if (stageKey === 'starforge') {
    if (!progress?.starforgeUnlocked) {
      return [{ value: 0, label: 'Locked' }]
    }
  }

  if (stageKey === 'ascension' || stageKey === 'transcendence') {
    if (entries.length > 0) {
      entries.forEach((entry, index) => {
        options.push({ value: index + 1, label: entry?.name || `Stage ${index + 1}` })
      })
    } else {
      options.push(
        { value: 1, label: 'Unlocked' },
        { value: 2, label: 'Completed' },
      )
    }

    return options
  }

  const previousKey = skipPreviousStageLock ? null : (stageIndex > 0 ? STAGE_ORDER[stageIndex - 1] : null)
  const previousValue = previousKey ? getBlueprintStageValue(progress, previousKey) : Infinity

  if (previousValue < 1) {
    return options
  }

  if (entries.length > 0) {
    entries.forEach((entry, index) => {
      options.push({ value: index + 1, label: entry?.name || `Stage ${index + 1}` })
    })
  } else {
    options.push(
      { value: 1, label: 'Unlocked' },
      { value: 2, label: 'Completed' },
    )
  }

  return options
}
