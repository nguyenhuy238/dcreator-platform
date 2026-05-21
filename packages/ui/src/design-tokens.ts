export const dCreatorTokens = {
  color: {
    background: {
      base: "#FFFFFF",
      subtle: "#FAFAFA",
      neutral: "#F8F8F7",
    },
    text: {
      primary: "#18181B",
      secondary: "#3F3F46",
      muted: "#71717A",
      inverse: "#FFFFFF",
    },
    border: {
      soft: "#E4E4E7",
      strong: "#D4D4D8",
    },
    brand: {
      primary: "#0EA5E9",
      primaryHover: "#0284C7",
      accent: "#14B8A6",
    },
    state: {
      success: "#10B981",
      warning: "#F59E0B",
      error: "#EF4444",
      info: "#3B82F6",
    },
  },
  radius: {
    card: "1rem",
    button: "0.875rem",
    modal: "1rem",
    pill: "9999px",
  },
  shadow: {
    card: "0 8px 30px rgba(24,24,27,0.06)",
    elevated: "0 12px 40px rgba(24,24,27,0.1)",
  },
  typography: {
    heading: {
      family: "Manrope, ui-sans-serif, system-ui, sans-serif",
      weight: "800",
    },
    body: {
      family: "Inter, ui-sans-serif, system-ui, sans-serif",
      weight: "400",
    },
  },
} as const;

export const dCreatorTailwindThemeExtension = {
  colors: {
    dc: {
      bg: "#FFFFFF",
      subtle: "#FAFAFA",
      neutral: "#F8F8F7",
      text: "#18181B",
      muted: "#71717A",
      border: "#E4E4E7",
      primary: "#0EA5E9",
      "primary-hover": "#0284C7",
      accent: "#14B8A6",
      success: "#10B981",
      warning: "#F59E0B",
      error: "#EF4444",
      info: "#3B82F6",
    },
  },
  borderRadius: {
    card: "1rem",
  },
  boxShadow: {
    card: "0 8px 30px rgba(24,24,27,0.06)",
  },
  fontFamily: {
    heading: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
    body: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
  },
} as const;
