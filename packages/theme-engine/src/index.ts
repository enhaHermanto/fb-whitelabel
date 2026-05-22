import type { TenantConfig } from '@resto-pos/shared-types';

/**
 * Injects CSS variables dynamic properties into the target element (defaults to document.documentElement)
 * based on the provided tenant branding configuration.
 */
export function injectTheme(config: TenantConfig, target: HTMLElement = document.documentElement): void {
  if (!config || !config.branding || !config.branding.theme) {
    console.warn("ThemeEngine: Branding configuration is missing or incomplete. Fallback default themes will be used.");
    return;
  }

  const theme = config.branding.theme;
  const brandName = config.branding.brand_name;

  console.log(`ThemeEngine: Injecting dynamic styles for tenant [${brandName}]`);

  // Map variables
  const variables: Record<string, string> = {
    '--color-primary': theme.primary_color,
    '--color-primary-hover': darkenColor(theme.primary_color, 15),
    '--color-secondary': theme.secondary_color,
    '--color-background': theme.background_color,
    '--color-surface': theme.surface_color,
    '--color-text-primary': theme.text_primary,
    '--color-text-secondary': theme.text_secondary,
    '--color-accent': theme.accent_color,
    '--color-error': theme.error_color,
    '--color-success': theme.success_color,
    '--font-family': theme.font_family,
    '--border-radius': theme.border_radius,
    '--logo-url': config.branding.logo_url ? `url('${config.branding.logo_url}')` : 'none',
    '--logo-dark-url': config.branding.logo_dark_url ? `url('${config.branding.logo_dark_url}')` : 'none',
    '--bg-image': config.branding.background_image_url ? `url('${config.branding.background_image_url}')` : 'none'
  };

  // Set properties on document Element
  for (const [key, value] of Object.entries(variables)) {
    target.style.setProperty(key, value);
  }
}

/**
 * Helper to simple darken a HEX color dynamically for button hovers etc.
 */
function darkenColor(hex: string, percent: number): string {
  try {
    hex = hex.replace(/^\s*#|\s*$/g, '');
    if (hex.length === 3) {
      hex = hex.replace(/(.)/g, '$1$1');
    }
    let r = parseInt(hex.substr(0, 2), 16);
    let g = parseInt(hex.substr(2, 2), 16);
    let b = parseInt(hex.substr(4, 2), 16);

    r = Math.max(0, Math.min(255, Math.floor(r * (100 - percent) / 100)));
    g = Math.max(0, Math.min(255, Math.floor(g * (100 - percent) / 100)));
    b = Math.max(0, Math.min(255, Math.floor(b * (100 - percent) / 100)));

    const rHex = r.toString(16).padStart(2, '0');
    const gHex = g.toString(16).padStart(2, '0');
    const bHex = b.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  } catch (e) {
    return hex; // fallback
  }
}
