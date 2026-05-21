import { View, Text } from '@tarojs/components'
import { ReactNode, useState } from 'react'

interface AdvancedModeCollapseProps {
  title?: string
  hint?: string
  defaultOpen?: boolean
  children?: ReactNode
  className?: string
}

export default function AdvancedModeCollapse(props: AdvancedModeCollapseProps) {
  const {
    title = '展开高级模式（标签 / 条件 / 双打）',
    hint = '不填也可以提交，AI 会按基础信息出简版分析',
    defaultOpen = false,
    children,
    className = ''
  } = props

  const [open, setOpen] = useState<boolean>(defaultOpen)

  return (
    <View className={`advancedCollapse ${className}`}>
      <View
        className="advancedCollapseHeader"
        hoverClass="advancedCollapseHeaderHover"
        onClick={() => setOpen(v => !v)}
      >
        <View className="advancedCollapseTitleWrap">
          <Text className="advancedCollapseTitle">{title}</Text>
          {hint ? <Text className="advancedCollapseHint">{hint}</Text> : null}
        </View>
        <Text className="advancedCollapseChevron">{open ? '收起 ▲' : '展开 ▼'}</Text>
      </View>

      {open ? <View className="advancedCollapseBody">{children}</View> : null}
    </View>
  )
}
