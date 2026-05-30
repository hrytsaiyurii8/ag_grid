import { createApp } from 'vue'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AllEnterpriseModule } from 'ag-grid-enterprise'

import App from './App.vue'
import './style.css'

ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule])

createApp(App).mount('#app')
