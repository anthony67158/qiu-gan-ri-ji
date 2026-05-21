import { View } from '@tarojs/components'
import { DOUBLES_COORDINATION_ISSUES } from '../constants'
import Button from '@/components/ui/button'

export default function CoordinationIssuesTag(props: { value: string[]; onChange: (v: string[]) => void }) {
  const selected = props.value || []

  return (
    <View>
      <View className="tagGroupTitle">配合问题（最多选2个）</View>
      <View className="chipRow" style={{ marginTop: '10px' }}>
        {DOUBLES_COORDINATION_ISSUES.map(item => (
          <Button
            key={item.value}
            size="sm"
            variant="ghost"
            onClick={() => {
              const exists = selected.includes(item.value)
              const next = exists
                ? selected.filter(v => v !== item.value)
                : selected.length < 2
                  ? [...selected, item.value]
                  : selected
              props.onChange(next)
            }}
            className={`${selected.includes(item.value) ? 'chip chipActive' : 'chip'}`}
          >
            {item.label}
          </Button>
        ))}
      </View>
    </View>
  )
}
