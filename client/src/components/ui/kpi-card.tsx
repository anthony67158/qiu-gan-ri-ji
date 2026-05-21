import { View } from '@tarojs/components'
import Badge from './badge'

export type KPI = { label: string; value: string | number; variant?: 'default' | 'secondary' | 'success' | 'destructive' | 'practice' }

export default function KpiCard(props: { title: string; periodText?: string; actions?: any; kpis: KPI[] }) {
  return (
    <View className="card bigCard glassCard">
      <View className="cardInner">
        <View className="rowBetween">
          <View>
            <View style={{ fontWeight: 900 }}>{props.title}</View>
            {props.periodText ? <View className="hintText">{props.periodText}</View> : null}
          </View>
          {props.actions ? <View className="row">{props.actions}</View> : null}
        </View>
        <View className="kpiGrid">
          {props.kpis.map((k, idx) => (
            <View key={idx} className="kpiCell">
              <View className="hintText">{k.label}</View>
              <Badge variant={k.variant || 'default'}>{String(k.value)}</Badge>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

