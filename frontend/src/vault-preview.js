// 临时预览入口（仅用于验证 3D 金库开场，交付前删除）
import { createApp, h, ref, onMounted } from 'vue';
import './style.css';
import JourneyHero from './components/vault/JourneyHero.vue';
import CoinRow from './components/vault/CoinRow.vue';
import { useTheme } from './composables/useTheme';

const App = {
  setup() {
    // 临时：暴露昼夜切换，用于验证不重载即可切换
    const { setMode } = useTheme();
    window.__setMode = setMode;
    window.__loadMarker = 'loaded-once';
    const domesticPrice = ref(null);
    const intlPrice = ref(null);
    const premiumPercent = ref(null);
    const bars = ref([]);

    onMounted(async () => {
      try {
        const snap = await (await fetch('/api/price/all')).json();
        domesticPrice.value = snap.domestic?.price ?? null;
        intlPrice.value = snap.international?.price ?? null;
        premiumPercent.value = snap.premiumPercent ?? null;
      } catch (error) {
        console.warn('price fetch failed', error);
      }
      try {
        const quant = await (await fetch('/api/quant/cn?days=120')).json();
        bars.value = quant.bars ?? [];
      } catch (error) {
        console.warn('quant fetch failed', error);
      }
    });

    return () =>
      h('div', null, [
        h(JourneyHero, {
          domesticPrice: domesticPrice.value,
          intlPrice: intlPrice.value,
          premiumPercent: premiumPercent.value,
          bars: bars.value,
        }),
        h(
          'div',
          {
            id: 'workspace',
            style: 'height:100vh;background:#050507;color:#f3efe6;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif',
          },
          'WORKSPACE PLACEHOLDER'
        ),
        h(CoinRow, {
          labels: ['AU9999', 'XAU/USD', 'PREMIUM'],
          onSelect: (index) => console.log('select', index),
        }),
      ]);
  },
};

createApp(App).mount('#app');
