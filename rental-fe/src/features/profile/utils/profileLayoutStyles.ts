/** Shared layout + surface classes for owner and public lister profile pages. */

export const PROFILE_PAGE_GRID_CLASS =
  "mx-auto max-w-6xl md:grid md:grid-cols-[auto_minmax(0,1fr)] md:items-start md:gap-x-8 md:gap-y-4 lg:gap-x-10"

export const PROFILE_AVATAR_CELL_CLASS =
  "flex justify-center pt-2 sm:pt-4 md:col-start-1 md:row-start-1 md:justify-start md:pt-2"

export const PROFILE_DETAILS_CELL_CLASS =
  "mx-auto flex w-full min-w-0 max-w-lg flex-col items-center gap-3 px-1 sm:max-w-xl md:col-start-2 md:row-start-1 md:mx-0 md:max-w-none md:items-start md:gap-3 md:px-0 md:pt-2"

export const PROFILE_DETAILS_CONTENT_CLASS =
  "w-full max-w-md space-y-2 px-2 md:max-w-none md:px-0"

export const PROFILE_STATS_WRAPPER_CLASS =
  "flex w-full flex-col items-center gap-1.5 md:items-start"

export const PROFILE_TABS_SECTION_CLASS =
  "-mx-4 mt-4 sm:mx-0 sm:mt-5 md:col-span-2 md:col-start-1 md:row-start-2 md:mx-0 md:mt-0"

export const PROFILE_SECTION_TABLIST_BASE_CLASS =
  "border-b border-slate-200 text-slate-500"

export const PROFILE_SECTION_TABLIST_2_CLASS = `grid grid-cols-2 ${PROFILE_SECTION_TABLIST_BASE_CLASS}`

export const PROFILE_SECTION_TABLIST_3_CLASS = `grid grid-cols-3 ${PROFILE_SECTION_TABLIST_BASE_CLASS}`

export const PROFILE_TAB_CONTROLS_CLASS =
  "mt-4 flex flex-col items-center gap-3 md:flex-row md:justify-between"

export const PROFILE_TAB_CONTROLS_CENTERED_CLASS = "mt-4 flex justify-center"

/** Space between sub-tab controls and tab panel content. */
export const PROFILE_TAB_CONTENT_TOP_CLASS = "mt-3"

export const PROFILE_TAB_PANEL_CLASS = `${PROFILE_TAB_CONTENT_TOP_CLASS} bg-white`

export const PROFILE_ACTIONS_ROW_CLASS =
  "mt-1 flex w-full max-w-md items-center gap-2 px-2 md:w-auto md:max-w-none md:justify-start md:px-0"

export const PROFILE_PRIMARY_ACTION_CLASS =
  "flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 md:flex-none md:px-6"

export const PROFILE_ICON_BUTTON_CLASS =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-950 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"

export const PROFILE_EDIT_BADGE_CLASS =
  "absolute flex items-center justify-center rounded-full border-[3px] border-white bg-[#20D5EC] text-white shadow-md hover:bg-[#1bb8d4]"

export const PROFILE_EDIT_PATH = "/profile/edit"
export const PROFILE_PATH = "/profile"

export const PROFILE_PAGE_SHELL_CLASS =
  "min-h-screen bg-white px-4 pb-10 pt-6 text-slate-950"
