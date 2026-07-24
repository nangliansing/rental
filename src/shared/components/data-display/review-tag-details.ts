type ReviewTagDetails = {
  label: string
  description: string
}

const REVIEW_TAG_DETAILS: Record<string, ReviewTagDetails> = {
  RESPONSIVE: {
    label: "Responsive",
    description: "Reviewers often describe this lister as responsive.",
  },
  HELPFUL: {
    label: "Helpful",
    description: "Reviewers often found this lister helpful during their search.",
  },
  ACCURATE_INFO: {
    label: "Accurate information",
    description: "Reviewers often found the information shared by this lister accurate.",
  },
  FRIENDLY: {
    label: "Friendly",
    description: "Reviewers often describe their interactions with this lister as friendly.",
  },
  CLEAR_COMMUNICATION: {
    label: "Clear communication",
    description: "Reviewers often found this lister's communication clear.",
  },
  FAST_FOLLOW_UP: {
    label: "Fast follow-up",
    description: "Reviewers often mention receiving a quick follow-up from this lister.",
  },
  UNRESPONSIVE: {
    label: "Unresponsive",
    description: "Some reviewers report difficulty getting a response from this lister.",
  },
  INACCURATE_INFO: {
    label: "Inaccurate information",
    description: "Some reviewers report receiving inaccurate information from this lister.",
  },
  RUDE: {
    label: "Discourteous",
    description: "Some reviewers describe their interactions with this lister as discourteous.",
  },
  SUSPICIOUS: {
    label: "Suspicious behavior",
    description: "Some reviewers report behavior they considered suspicious.",
  },
  PRESSURE_TACTICS: {
    label: "Pressure tactics",
    description: "Some reviewers report feeling pressured during their interactions.",
  },
}

export function getReviewTagDetails(tag: unknown): ReviewTagDetails | null {
  if (typeof tag !== "string") return null

  const normalizedTag = tag.trim().toUpperCase()
  if (!normalizedTag) return null

  return REVIEW_TAG_DETAILS[normalizedTag] ?? null
}
