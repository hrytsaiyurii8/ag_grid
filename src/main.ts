import { createApp } from 'vue'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AllEnterpriseModule, LicenseManager } from 'ag-grid-enterprise'

import App from './App.vue'
import './style.css'

const licenseKey = import.meta.env.VITE_AG_GRID_LICENSE_KEY
if (licenseKey) {
  LicenseManager.setLicenseKey(licenseKey)
}

ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule])

createApp(App).mount('#app')
