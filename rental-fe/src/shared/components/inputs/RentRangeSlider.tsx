// src/shared/components/inputs/RentRangeSlider.tsx

export type RentRangeSliderProps = {
    minRent?: number
    maxRent?: number
    min?: number
    max?: number
    step?: number
    onChange: (value: { minRent?: number; maxRent?: number }) => void
}

const formatRent = (value?: number) => {
    if (value === undefined) return "Any"
    return `฿${value.toLocaleString()}`
}

const thumbClassName =
    "pointer-events-none absolute inset-x-0 top-1/2 h-1 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-600 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:ring-4 [&::-webkit-slider-thumb]:ring-blue-100"

export function RentRangeSlider({
    minRent,
    maxRent,
    min = 0,
    max = 50000,
    step = 500,
    onChange,
}: RentRangeSliderProps) {
    const currentMinRent = minRent ?? min
    const currentMaxRent = maxRent ?? max

    const minPercent = ((currentMinRent - min) / (max - min)) * 100
    const maxPercent = ((currentMaxRent - min) / (max - min)) * 100

    const handleMinChange = (value: number) => {
        const nextMinRent = Math.min(value, currentMaxRent - step)

        onChange({
            minRent: nextMinRent === min ? undefined : nextMinRent,
            maxRent,
        })
    }

    const handleMaxChange = (value: number) => {
        const nextMaxRent = Math.max(value, currentMinRent + step)

        onChange({
            minRent,
            maxRent: nextMaxRent === max ? undefined : nextMaxRent,
        })
    }

    return (
        <div>
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs text-slate-500">Min rent</p>
                    <p className="text-sm font-semibold text-blue-700">
                        {formatRent(minRent)}
                    </p>
                </div>

                <div className="text-right">
                    <p className="text-xs text-slate-500">Max rent</p>
                    <p className="text-sm font-semibold text-blue-700">
                        {formatRent(maxRent)}
                    </p>
                </div>
            </div>

            <div className="relative h-9">
                <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-200" />

                <div
                    className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-blue-600"
                    style={{
                        left: `${minPercent}%`,
                        right: `${100 - maxPercent}%`,
                    }}
                />

                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={currentMinRent}
                    onChange={(event) => handleMinChange(Number(event.target.value))}
                    className={thumbClassName}
                    aria-label="Minimum rent"
                />

                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={currentMaxRent}
                    onChange={(event) => handleMaxChange(Number(event.target.value))}
                    className={thumbClassName}
                    aria-label="Maximum rent"
                />
            </div>
        </div>
    )
}