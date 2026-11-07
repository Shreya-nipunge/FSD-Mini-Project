/** Only permit test/seed writes against this explicitly isolated local database. */
export function isIsolatedDevelopmentDatabase(config) {
  return config?.host === '127.0.0.1'
    && config?.database === 'crimemap_admin_dev';
}
