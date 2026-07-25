export function toSelectableChipOptions<TValue extends string | number>(
  options: TValue[] | { label: string; value: TValue }[],
) {
  return options.map((option) =>
    typeof option === "object"
      ? option
      : {
          label: String(option),
          value: option,
        },
  )
}
