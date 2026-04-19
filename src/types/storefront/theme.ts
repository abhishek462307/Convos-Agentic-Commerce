export interface ThemeTokens {
  background: string
  cardBackground: string
  textPrimary: string
  textSecondary: string
  border: string
  primary: string
  primaryForeground: string
  highlightColor: string
  fontHeading: string
  fontBody: string
  spacingSection: string
  cardRadius: string
  cardRadiusSm: string
}

export interface LoaderConfig {
  style: 'spinner' | 'dots' | 'pulse' | 'bars' | 'logo'
  logoUrl: string | null
  logoUrlDesktop: string | null
  logoWidthMobile: number
  logoHeightMobile: number
  logoWidthDesktop: number
  logoHeightDesktop: number
  primaryColor: string
}
